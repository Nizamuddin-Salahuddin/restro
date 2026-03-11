import express from 'express';
import { query } from '../db/config.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require cook authentication
router.use(authenticate);
router.use(authorize('cook', 'admin'));

// Get all pending/preparing dine-in items (Kitchen Display)
router.get('/dine-in-orders', async (req, res) => {
  try {
    const { status } = req.query;

    let itemStatus = ['pending', 'preparing'];
    if (status) {
      itemStatus = status.split(',');
    }

    const result = await query(`
      SELECT 
        doi.id,
        doi.dine_in_order_id,
        doi.menu_item_id,
        doi.item_name,
        doi.quantity,
        doi.status,
        doi.special_instructions,
        doi.created_at,
        dio.order_number,
        t.table_number,
        mi.is_veg,
        mi.prep_time_minutes
      FROM dine_in_order_items doi
      JOIN dine_in_orders dio ON doi.dine_in_order_id = dio.id
      JOIN restaurant_tables t ON dio.table_id = t.id
      LEFT JOIN menu_items mi ON doi.menu_item_id = mi.id
      WHERE dio.status = 'active' AND doi.status = ANY($1)
      ORDER BY doi.created_at ASC
    `, [itemStatus]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching dine-in orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get all pending/preparing online orders
router.get('/online-orders', async (req, res) => {
  try {
    const { status } = req.query;

    let orderStatus = ['confirmed', 'preparing'];
    if (status) {
      orderStatus = status.split(',');
    }

    const result = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.special_instructions,
        o.created_at,
        o.estimated_delivery_time,
        json_agg(json_build_object(
          'id', oi.id,
          'item_name', oi.item_name,
          'quantity', oi.quantity,
          'special_instructions', oi.special_instructions,
          'is_veg', mi.is_veg
        )) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.status = ANY($1)
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `, [orderStatus]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching online orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get combined kitchen view (both dine-in items and online orders)
router.get('/all-orders', async (req, res) => {
  try {
    // Get dine-in items
    const dineInResult = await query(`
      SELECT 
        doi.id,
        'dine_in' as order_type,
        doi.dine_in_order_id as order_id,
        dio.order_number,
        t.table_number,
        doi.item_name,
        doi.quantity,
        doi.status,
        doi.special_instructions,
        doi.created_at,
        mi.is_veg,
        mi.prep_time_minutes
      FROM dine_in_order_items doi
      JOIN dine_in_orders dio ON doi.dine_in_order_id = dio.id
      JOIN restaurant_tables t ON dio.table_id = t.id
      LEFT JOIN menu_items mi ON doi.menu_item_id = mi.id
      WHERE dio.status = 'active' AND doi.status IN ('pending', 'preparing')
      ORDER BY doi.created_at ASC
    `);

    // Get online orders with items
    const onlineResult = await query(`
      SELECT 
        o.id,
        o.id as order_id,
        'online' as order_type,
        o.order_number,
        NULL as table_number,
        o.status as order_status,
        o.special_instructions as order_instructions,
        o.created_at,
        json_agg(json_build_object(
          'id', oi.id,
          'item_name', oi.item_name,
          'quantity', oi.quantity,
          'special_instructions', oi.special_instructions,
          'is_veg', mi.is_veg,
          'prep_time_minutes', mi.prep_time_minutes
        )) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.status IN ('confirmed', 'preparing')
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `);

    res.json({
      dineIn: dineInResult.rows,
      online: onlineResult.rows
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update dine-in item status
router.patch('/dine-in-items/:itemId/status', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body; // pending, preparing, ready, served

    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let updateFields = 'status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status, itemId];

    if (status === 'ready') {
      updateFields += ', ready_at = CURRENT_TIMESTAMP';
    } else if (status === 'served') {
      updateFields += ', served_at = CURRENT_TIMESTAMP';
    }

    const result = await query(`
      UPDATE dine_in_order_items 
      SET ${updateFields}
      WHERE id = $2
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('dine_in_item_status_update', {
        itemId,
        status,
        orderId: result.rows[0].dine_in_order_id
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update online order status
router.patch('/online-orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // preparing, ready

    const validStatuses = ['preparing', 'ready'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: preparing, ready' });
    }

    const result = await query(`
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Add to status history
    await query(`
      INSERT INTO order_status_history (order_id, status, notes, updated_by)
      VALUES ($1, $2, 'Updated by kitchen', $3)
    `, [orderId, status, req.user.id]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_update', {
        orderId,
        status,
        orderNumber: result.rows[0].order_number
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Mark all items of a dine-in order as ready
router.patch('/dine-in-orders/:orderId/ready', async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await query(`
      UPDATE dine_in_order_items 
      SET status = 'ready', ready_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE dine_in_order_id = $1 AND status IN ('pending', 'preparing')
      RETURNING *
    `, [orderId]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('dine_in_order_ready', { orderId });
    }

    res.json({ message: 'All items marked as ready', count: result.rowCount });
  } catch (error) {
    console.error('Error marking order ready:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get kitchen stats
router.get('/stats', async (req, res) => {
  try {
    // Dine-in pending items
    const dineInPending = await query(`
      SELECT COUNT(*) as count
      FROM dine_in_order_items doi
      JOIN dine_in_orders dio ON doi.dine_in_order_id = dio.id
      WHERE dio.status = 'active' AND doi.status = 'pending'
    `);

    // Dine-in preparing items
    const dineInPreparing = await query(`
      SELECT COUNT(*) as count
      FROM dine_in_order_items doi
      JOIN dine_in_orders dio ON doi.dine_in_order_id = dio.id
      WHERE dio.status = 'active' AND doi.status = 'preparing'
    `);

    // Dine-in ready items
    const dineInReady = await query(`
      SELECT COUNT(*) as count
      FROM dine_in_order_items doi
      JOIN dine_in_orders dio ON doi.dine_in_order_id = dio.id
      WHERE dio.status = 'active' AND doi.status = 'ready'
    `);

    // Online pending orders
    const onlinePending = await query(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'confirmed'
    `);

    // Online preparing orders
    const onlinePreparing = await query(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'preparing'
    `);

    // Online ready orders
    const onlineReady = await query(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'ready'
    `);

    // Active tables
    const activeTables = await query(`
      SELECT COUNT(*) as count FROM restaurant_tables WHERE status = 'occupied'
    `);

    res.json({
      dineIn: {
        pending: parseInt(dineInPending.rows[0].count),
        preparing: parseInt(dineInPreparing.rows[0].count),
        ready: parseInt(dineInReady.rows[0].count)
      },
      online: {
        pending: parseInt(onlinePending.rows[0].count),
        preparing: parseInt(onlinePreparing.rows[0].count),
        ready: parseInt(onlineReady.rows[0].count)
      },
      activeTables: parseInt(activeTables.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
