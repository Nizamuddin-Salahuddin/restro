import express from 'express';
import { query } from '../db/config.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require waiter authentication
router.use(authenticate);
router.use(authorize('waiter', 'admin'));

// Get all tables with status
router.get('/tables', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        t.*,
        CASE 
          WHEN dio.id IS NOT NULL THEN json_build_object(
            'order_id', dio.id,
            'order_number', dio.order_number,
            'guest_count', dio.guest_count,
            'total_amount', dio.total_amount,
            'created_at', dio.created_at
          )
          ELSE NULL
        END as active_order
      FROM restaurant_tables t
      LEFT JOIN dine_in_orders dio ON t.id = dio.table_id AND dio.status = 'active'
      WHERE t.is_active = true
      ORDER BY t.floor, t.table_number
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get single table details
router.get('/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT * FROM restaurant_tables WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// Get menu items for ordering
router.get('/menu', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        mi.*,
        c.name as category_name
      FROM menu_items mi
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE mi.is_available = true
      ORDER BY c.sort_order, mi.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM categories WHERE is_active = true ORDER BY sort_order
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create new dine-in order (book a table)
router.post('/orders', async (req, res) => {
  try {
    const { tableId, customerName, customerPhone, guestCount, notes } = req.body;
    const waiterId = req.user.id;

    // Check if table exists and is available
    const tableResult = await query(`
      SELECT * FROM restaurant_tables WHERE id = $1
    `, [tableId]);

    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check if table already has an active order
    const existingOrder = await query(`
      SELECT id FROM dine_in_orders WHERE table_id = $1 AND status = 'active'
    `, [tableId]);

    if (existingOrder.rows.length > 0) {
      return res.status(400).json({ error: 'Table already has an active order' });
    }

    // Generate order number
    const orderNumber = `DI${Date.now().toString().slice(-8)}`;

    // Create the order
    const result = await query(`
      INSERT INTO dine_in_orders (order_number, table_id, waiter_id, customer_name, customer_phone, guest_count, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [orderNumber, tableId, waiterId, customerName, customerPhone, guestCount || 1, notes]);

    // Update table status
    await query(`
      UPDATE restaurant_tables SET status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [tableId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get active order for a table
router.get('/orders/table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    const orderResult = await query(`
      SELECT 
        dio.*,
        t.table_number,
        u.name as waiter_name
      FROM dine_in_orders dio
      JOIN restaurant_tables t ON dio.table_id = t.id
      LEFT JOIN users u ON dio.waiter_id = u.id
      WHERE dio.table_id = $1 AND dio.status = 'active'
    `, [tableId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active order for this table' });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await query(`
      SELECT * FROM dine_in_order_items 
      WHERE dine_in_order_id = $1
      ORDER BY created_at
    `, [order.id]);

    order.items = itemsResult.rows;

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get order by ID
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const orderResult = await query(`
      SELECT 
        dio.*,
        t.table_number,
        u.name as waiter_name
      FROM dine_in_orders dio
      JOIN restaurant_tables t ON dio.table_id = t.id
      LEFT JOIN users u ON dio.waiter_id = u.id
      WHERE dio.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await query(`
      SELECT * FROM dine_in_order_items 
      WHERE dine_in_order_id = $1
      ORDER BY created_at
    `, [order.id]);

    order.items = itemsResult.rows;

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Add items to order
router.post('/orders/:orderId/items', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body; // Array of { menuItemId, quantity, specialInstructions }

    // Verify order exists and is active
    const orderResult = await query(`
      SELECT * FROM dine_in_orders WHERE id = $1 AND status = 'active'
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active order not found' });
    }

    // Add each item
    for (const item of items) {
      // Get menu item details
      const menuItem = await query(`
        SELECT id, name, price FROM menu_items WHERE id = $1
      `, [item.menuItemId]);

      if (menuItem.rows.length === 0) continue;

      const mi = menuItem.rows[0];

      await query(`
        INSERT INTO dine_in_order_items (dine_in_order_id, menu_item_id, item_name, item_price, quantity, special_instructions)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [orderId, mi.id, mi.name, mi.price, item.quantity, item.specialInstructions]);
    }

    // Recalculate totals
    const totalsResult = await query(`
      SELECT SUM(item_price * quantity) as subtotal
      FROM dine_in_order_items
      WHERE dine_in_order_id = $1
    `, [orderId]);

    const subtotal = parseFloat(totalsResult.rows[0].subtotal) || 0;
    const taxAmount = subtotal * 0.05; // 5% GST
    const totalAmount = subtotal + taxAmount;

    await query(`
      UPDATE dine_in_orders 
      SET subtotal = $1, tax_amount = $2, total_amount = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [subtotal, taxAmount, totalAmount, orderId]);

    // Emit socket event for kitchen
    const io = req.app.get('io');
    if (io) {
      io.emit('new_dine_in_items', { orderId, items });
    }

    // Return updated order
    const updatedOrder = await query(`
      SELECT * FROM dine_in_orders WHERE id = $1
    `, [orderId]);

    const orderItems = await query(`
      SELECT * FROM dine_in_order_items WHERE dine_in_order_id = $1 ORDER BY created_at
    `, [orderId]);

    res.json({ ...updatedOrder.rows[0], items: orderItems.rows });
  } catch (error) {
    console.error('Error adding items:', error);
    res.status(500).json({ error: 'Failed to add items' });
  }
});

// Remove item from order
router.delete('/orders/:orderId/items/:itemId', async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    // Verify order is active
    const orderResult = await query(`
      SELECT * FROM dine_in_orders WHERE id = $1 AND status = 'active'
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active order not found' });
    }

    // Check if item exists and is not yet being prepared
    const itemResult = await query(`
      SELECT * FROM dine_in_order_items WHERE id = $1 AND dine_in_order_id = $2
    `, [itemId, orderId]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (itemResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Cannot remove item that is already being prepared' });
    }

    // Delete the item
    await query(`
      DELETE FROM dine_in_order_items WHERE id = $1
    `, [itemId]);

    // Recalculate totals
    const totalsResult = await query(`
      SELECT COALESCE(SUM(item_price * quantity), 0) as subtotal
      FROM dine_in_order_items
      WHERE dine_in_order_id = $1
    `, [orderId]);

    const subtotal = parseFloat(totalsResult.rows[0].subtotal) || 0;
    const taxAmount = subtotal * 0.05;
    const totalAmount = subtotal + taxAmount;

    await query(`
      UPDATE dine_in_orders 
      SET subtotal = $1, tax_amount = $2, total_amount = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [subtotal, taxAmount, totalAmount, orderId]);

    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Generate bill (set to billing status)
router.post('/orders/:orderId/generate-bill', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { discount } = req.body;

    const orderResult = await query(`
      SELECT dio.*, t.id as table_id
      FROM dine_in_orders dio
      JOIN restaurant_tables t ON dio.table_id = t.id
      WHERE dio.id = $1 AND dio.status = 'active'
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active order not found' });
    }

    const order = orderResult.rows[0];

    // Calculate with discount if provided
    let discountAmount = 0;
    if (discount) {
      discountAmount = parseFloat(discount);
    }

    const newTotal = parseFloat(order.subtotal) + parseFloat(order.tax_amount) - discountAmount;

    // Update order
    await query(`
      UPDATE dine_in_orders 
      SET discount_amount = $1, total_amount = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [discountAmount, newTotal, orderId]);

    // Update table status to billing
    await query(`
      UPDATE restaurant_tables SET status = 'billing', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [order.table_id]);

    // Return full order with items for bill
    const updatedOrder = await query(`
      SELECT 
        dio.*,
        t.table_number,
        u.name as waiter_name
      FROM dine_in_orders dio
      JOIN restaurant_tables t ON dio.table_id = t.id
      LEFT JOIN users u ON dio.waiter_id = u.id
      WHERE dio.id = $1
    `, [orderId]);

    const items = await query(`
      SELECT * FROM dine_in_order_items WHERE dine_in_order_id = $1 ORDER BY created_at
    `, [orderId]);

    res.json({ ...updatedOrder.rows[0], items: items.rows });
  } catch (error) {
    console.error('Error generating bill:', error);
    res.status(500).json({ error: 'Failed to generate bill' });
  }
});

// Complete order (payment received)
router.post('/orders/:orderId/complete', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod } = req.body;

    const orderResult = await query(`
      SELECT dio.*, t.id as table_id
      FROM dine_in_orders dio
      JOIN restaurant_tables t ON dio.table_id = t.id
      WHERE dio.id = $1 AND dio.status = 'active'
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active order not found' });
    }

    const order = orderResult.rows[0];

    // Update order status
    await query(`
      UPDATE dine_in_orders 
      SET status = 'completed', payment_status = 'paid', payment_method = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [paymentMethod || 'cash', orderId]);

    // Free up the table
    await query(`
      UPDATE restaurant_tables SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [order.table_id]);

    res.json({ message: 'Order completed successfully' });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// Cancel order
router.post('/orders/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const orderResult = await query(`
      SELECT dio.*, t.id as table_id
      FROM dine_in_orders dio
      JOIN restaurant_tables t ON dio.table_id = t.id
      WHERE dio.id = $1 AND dio.status = 'active'
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active order not found' });
    }

    const order = orderResult.rows[0];

    // Update order status
    await query(`
      UPDATE dine_in_orders 
      SET status = 'cancelled', notes = COALESCE(notes || ' | ', '') || $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [reason ? `Cancelled: ${reason}` : 'Cancelled', orderId]);

    // Free up the table
    await query(`
      UPDATE restaurant_tables SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [order.table_id]);

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get waiter's orders history
router.get('/my-orders', async (req, res) => {
  try {
    const waiterId = req.user.id;
    const { status, date } = req.query;

    let queryStr = `
      SELECT 
        dio.*,
        t.table_number,
        (SELECT COUNT(*) FROM dine_in_order_items WHERE dine_in_order_id = dio.id) as item_count
      FROM dine_in_orders dio
      JOIN restaurant_tables t ON dio.table_id = t.id
      WHERE dio.waiter_id = $1
    `;
    const params = [waiterId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      queryStr += ` AND dio.status = $${paramCount}`;
      params.push(status);
    }

    if (date) {
      paramCount++;
      queryStr += ` AND DATE(dio.created_at) = $${paramCount}`;
      params.push(date);
    }

    queryStr += ` ORDER BY dio.created_at DESC LIMIT 50`;

    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

export default router;
