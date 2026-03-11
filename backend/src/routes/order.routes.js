import express from 'express';
import { body } from 'express-validator';
import { query, getClient } from '../db/config.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { generateOrderNumber, calculateDeliveryTime } from '../utils/helpers.js';

const router = express.Router();

// Get user's orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        o.id, o.order_number, o.status, o.total_amount, o.delivery_fee, o.tax_amount,
        o.delivery_address, o.estimated_delivery_time, o.created_at,
        u.name as delivery_boy_name, u.phone as delivery_boy_phone
      FROM orders o
      LEFT JOIN users u ON o.delivery_boy_id = u.id
      WHERE o.user_id = $1
    `;
    const params = [req.user.id];

    if (status) {
      sql += ' AND o.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get order items for each order
    for (let order of result.rows) {
      const itemsResult = await query(
        'SELECT item_name, item_price, quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single order details
router.get('/:orderNumber', authenticate, async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    const orderResult = await query(
      `SELECT 
        o.*,
        u.name as customer_name, u.phone as customer_phone,
        d.name as delivery_boy_name, d.phone as delivery_boy_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN users d ON o.delivery_boy_id = d.id
      WHERE o.order_number = $1`,
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check authorization
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Get order items
    const itemsResult = await query(
      'SELECT item_name, item_price, quantity, special_instructions FROM order_items WHERE order_id = $1',
      [order.id]
    );
    order.items = itemsResult.rows;

    // Get status history
    const historyResult = await query(
      `SELECT osh.status, osh.notes, osh.created_at, u.name as updated_by
       FROM order_status_history osh
       LEFT JOIN users u ON osh.updated_by = u.id
       WHERE osh.order_id = $1
       ORDER BY osh.created_at DESC`,
      [order.id]
    );
    order.statusHistory = historyResult.rows;

    // Get latest delivery location if order is on the way
    if (['picked_up', 'on_the_way'].includes(order.status)) {
      const locationResult = await query(
        `SELECT latitude, longitude, timestamp 
         FROM delivery_tracking 
         WHERE order_id = $1 
         ORDER BY timestamp DESC LIMIT 1`,
        [order.id]
      );
      if (locationResult.rows.length > 0) {
        order.deliveryLocation = locationResult.rows[0];
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// Create order from cart
router.post('/create', authenticate, [
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
], validate, async (req, res, next) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { deliveryAddress, deliveryLatitude, deliveryLongitude, specialInstructions, paymentMethod = 'online' } = req.body;

    // Get cart items
    const cartResult = await client.query(
      `SELECT 
        ci.quantity, ci.special_instructions,
        m.id as menu_item_id, m.name, m.price, m.prep_time_minutes
      FROM cart_items ci
      JOIN menu_items m ON ci.menu_item_id = m.id
      WHERE ci.user_id = $1 AND m.is_available = true`,
      [req.user.id]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const cartItems = cartResult.rows;
    
    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 30;
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const totalAmount = subtotal + deliveryFee + taxAmount;

    // Calculate estimated delivery time
    const maxPrepTime = Math.max(...cartItems.map(i => i.prep_time_minutes));
    const estimatedDeliveryTime = calculateDeliveryTime(maxPrepTime);

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, user_id, total_amount, delivery_fee, tax_amount,
        delivery_address, delivery_latitude, delivery_longitude,
        special_instructions, estimated_delivery_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *`,
      [
        orderNumber, req.user.id, totalAmount, deliveryFee, taxAmount,
        deliveryAddress, deliveryLatitude || null, deliveryLongitude || null,
        specialInstructions || null, estimatedDeliveryTime
      ]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.menu_item_id, item.name, item.price, item.quantity, item.special_instructions]
      );
    }

    // Add to status history
    await client.query(
      'INSERT INTO order_status_history (order_id, status, updated_by) VALUES ($1, $2, $3)',
      [order.id, 'pending', req.user.id]
    );

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

    await client.query('COMMIT');

    // Emit socket event for new order (admin/kitchen notification)
    const io = req.app.get('io');
    io.to('admin').emit('new_order', { orderNumber, totalAmount });

    // If COD, confirm order immediately
    if (paymentMethod === 'cod') {
      await query(
        `UPDATE orders SET status = 'confirmed', payment_method = 'cod', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [order.id]
      );
      await query(
        'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
        [order.id, 'confirmed', 'Cash on Delivery order', req.user.id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        estimatedDeliveryTime: order.estimated_delivery_time,
        paymentMethod
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Cancel order (customer)
router.put('/:orderNumber/cancel', authenticate, async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { reason } = req.body;

    const orderResult = await query(
      'SELECT id, status, user_id FROM orders WHERE order_number = $1',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    await query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', order.id]
    );

    await query(
      'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [order.id, 'cancelled', reason || 'Cancelled by customer', req.user.id]
    );

    // Emit socket event
    const io = req.app.get('io');
    io.to('admin').emit('order_cancelled', { orderNumber });
    io.to(`order_${orderNumber}`).emit('order_status', { status: 'cancelled' });

    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    next(error);
  }
});

export default router;
