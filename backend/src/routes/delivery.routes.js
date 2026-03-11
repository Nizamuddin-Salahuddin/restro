import express from 'express';
import { query } from '../db/config.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get available orders (ready for pickup, not yet assigned)
router.get('/available', authenticate, authorize('delivery'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        o.id, o.order_number, o.status, o.total_amount,
        o.delivery_address, o.delivery_latitude, o.delivery_longitude,
        o.estimated_delivery_time, o.created_at,
        u.name as customer_name, u.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status = 'ready' AND o.delivery_boy_id IS NULL
      ORDER BY o.created_at ASC
    `);

    // Get items for each order
    for (let order of result.rows) {
      const itemsResult = await query(
        'SELECT item_name, quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Pick up an order (self-assign)
router.post('/pickup/:orderNumber', authenticate, authorize('delivery'), async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    // Check if order is available for pickup
    const orderResult = await query(
      `SELECT id, status, delivery_boy_id FROM orders WHERE order_number = $1`,
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'ready') {
      return res.status(400).json({ success: false, message: 'Order is not ready for pickup' });
    }

    if (order.delivery_boy_id) {
      return res.status(400).json({ success: false, message: 'Order already assigned to another delivery partner' });
    }

    // Assign and update status to picked_up
    await query(
      `UPDATE orders 
       SET delivery_boy_id = $1, status = 'picked_up', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [req.user.id, order.id]
    );

    // Add to status history
    await query(
      'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [order.id, 'picked_up', 'Self-assigned by delivery partner', req.user.id]
    );

    // Emit socket events
    const io = req.app.get('io');
    io.to(`order_${orderNumber}`).emit('order_status', { status: 'picked_up' });
    io.to('admin').emit('order_status_update', { orderNumber, status: 'picked_up', deliveryBoyId: req.user.id });
    io.to('delivery').emit('order_picked', { orderNumber, deliveryBoyId: req.user.id });

    res.json({ success: true, message: 'Order picked up successfully' });
  } catch (error) {
    next(error);
  }
});

// Get assigned orders for delivery boy
router.get('/orders', authenticate, authorize('delivery'), async (req, res, next) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
        o.id, o.order_number, o.status, o.total_amount,
        o.delivery_address, o.delivery_latitude, o.delivery_longitude,
        o.estimated_delivery_time, o.created_at,
        u.name as customer_name, u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.delivery_boy_id = $1
    `;
    const params = [req.user.id];

    if (status && status !== 'active') {
      sql += ' AND o.status = $2';
      params.push(status);
    } else if (status === 'active' || !status) {
      // Show active orders (not delivered/cancelled)
      sql += " AND o.status IN ('ready', 'picked_up', 'on_the_way')";
    }

    sql += ' ORDER BY o.created_at DESC';

    const result = await query(sql, params);

    // Get items for each order
    for (let order of result.rows) {
      const itemsResult = await query(
        'SELECT item_name, quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get delivery history
router.get('/history', authenticate, authorize('delivery'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        o.order_number, o.status, o.total_amount, o.delivery_address,
        o.created_at, o.actual_delivery_time,
        u.name as customer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.delivery_boy_id = $1 AND o.status IN ('delivered', 'cancelled')
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Update order status (delivery boy)
router.put('/orders/:orderNumber/status', authenticate, authorize('delivery'), async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { status, notes } = req.body;

    // Validate status transition for delivery boy
    const allowedStatuses = ['picked_up', 'on_the_way', 'delivered'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Allowed: picked_up, on_the_way, delivered' 
      });
    }

    const orderResult = await query(
      'SELECT id, delivery_boy_id, status FROM orders WHERE order_number = $1',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.delivery_boy_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This order is not assigned to you' });
    }

    // Update order status
    const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const updateParams = [status];

    if (status === 'delivered') {
      updateFields.push('actual_delivery_time = CURRENT_TIMESTAMP');
    }

    await query(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${updateParams.length + 1}`,
      [...updateParams, order.id]
    );

    // Add to status history
    await query(
      'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [order.id, status, notes || null, req.user.id]
    );

    // Emit socket event
    const io = req.app.get('io');
    io.to(`order_${orderNumber}`).emit('order_status', { status, notes });
    io.to('admin').emit('order_status_update', { orderNumber, status });

    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    next(error);
  }
});

// Update delivery location
router.post('/location', authenticate, authorize('delivery'), async (req, res, next) => {
  try {
    const { orderNumber, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Location coordinates required' });
    }

    const orderResult = await query(
      'SELECT id, delivery_boy_id FROM orders WHERE order_number = $1',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.delivery_boy_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Insert tracking record
    await query(
      `INSERT INTO delivery_tracking (order_id, delivery_boy_id, latitude, longitude)
       VALUES ($1, $2, $3, $4)`,
      [order.id, req.user.id, latitude, longitude]
    );

    // Emit socket event for real-time tracking
    const io = req.app.get('io');
    io.to(`order_${orderNumber}`).emit('delivery_location', { latitude, longitude });

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    next(error);
  }
});

// Get delivery stats
router.get('/stats', authenticate, authorize('delivery'), async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Today's deliveries
    const todayResult = await query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE delivery_boy_id = $1 AND status = 'delivered' AND actual_delivery_time >= $2`,
      [req.user.id, todayStart]
    );

    // Total deliveries
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM orders WHERE delivery_boy_id = $1 AND status = 'delivered'`,
      [req.user.id]
    );

    // Active orders
    const activeResult = await query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE delivery_boy_id = $1 AND status IN ('ready', 'picked_up', 'on_the_way')`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        todayDeliveries: parseInt(todayResult.rows[0].count),
        totalDeliveries: parseInt(totalResult.rows[0].count),
        activeOrders: parseInt(activeResult.rows[0].count),
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
