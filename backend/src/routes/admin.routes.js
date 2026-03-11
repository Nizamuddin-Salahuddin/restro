import express from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { query } from '../db/config.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// ============ DASHBOARD ============

// Get dashboard stats
router.get('/dashboard', async (req, res, next) => {
  try {
    const { date } = req.query;
    
    // Use provided date or default to today
    let targetDate;
    if (date) {
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
    }
    
    const dateStart = new Date(targetDate);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(targetDate);
    dateEnd.setHours(23, 59, 59, 999);

    // Online Orders for selected date
    const dateOrders = await query(
      'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE created_at >= $1 AND created_at <= $2',
      [dateStart, dateEnd]
    );

    // Dine-in Orders for selected date
    const dineInOrders = await query(
      'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue FROM dine_in_orders WHERE created_at >= $1 AND created_at <= $2',
      [dateStart, dateEnd]
    );

    // Total orders (online + dine-in)
    const totalOnlineOrders = await query('SELECT COUNT(*) as count FROM orders');
    const totalDineInOrders = await query('SELECT COUNT(*) as count FROM dine_in_orders');

    // Pending orders (always current) - online
    const pendingOrders = await query(
      "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')"
    );

    // Active dine-in orders
    const activeDineIn = await query(
      "SELECT COUNT(*) as count FROM dine_in_orders WHERE status = 'active'"
    );

    // Active delivery boys
    const activeDelivery = await query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'delivery' AND is_active = true"
    );

    // Recent online orders for selected date
    const recentOrders = await query(
      `SELECT o.order_number, o.status, o.total_amount, o.created_at, u.name as customer_name, 'online' as order_type
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.created_at >= $1 AND o.created_at <= $2
       ORDER BY o.created_at DESC LIMIT 5`,
      [dateStart, dateEnd]
    );

    // Recent dine-in orders for selected date
    const recentDineInOrders = await query(
      `SELECT dio.order_number, dio.status, dio.total_amount, dio.created_at, 
              COALESCE(dio.customer_name, 'Walk-in') as customer_name, 
              t.table_number, 'dine_in' as order_type
       FROM dine_in_orders dio
       JOIN restaurant_tables t ON dio.table_id = t.id
       WHERE dio.created_at >= $1 AND dio.created_at <= $2
       ORDER BY dio.created_at DESC LIMIT 5`,
      [dateStart, dateEnd]
    );

    // Combine and sort recent orders
    const allRecentOrders = [...recentOrders.rows, ...recentDineInOrders.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        // Online stats
        todayOnlineOrders: parseInt(dateOrders.rows[0].count),
        todayOnlineRevenue: parseFloat(dateOrders.rows[0].revenue),
        // Dine-in stats
        todayDineInOrders: parseInt(dineInOrders.rows[0].count),
        todayDineInRevenue: parseFloat(dineInOrders.rows[0].revenue),
        // Combined stats
        todayOrders: parseInt(dateOrders.rows[0].count) + parseInt(dineInOrders.rows[0].count),
        todayRevenue: parseFloat(dateOrders.rows[0].revenue) + parseFloat(dineInOrders.rows[0].revenue),
        totalOrders: parseInt(totalOnlineOrders.rows[0].count) + parseInt(totalDineInOrders.rows[0].count),
        pendingOrders: parseInt(pendingOrders.rows[0].count),
        activeDineIn: parseInt(activeDineIn.rows[0].count),
        activeDeliveryBoys: parseInt(activeDelivery.rows[0].count),
        recentOrders: allRecentOrders,
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ MENU MANAGEMENT ============

// Get all menu items (including unavailable)
router.get('/menu', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.*, c.name as category_name
       FROM menu_items m
       LEFT JOIN categories c ON m.category_id = c.id
       ORDER BY c.sort_order, m.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Add menu item
router.post('/menu', [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('categoryId').isInt().withMessage('Category is required'),
], validate, async (req, res, next) => {
  try {
    const { 
      name, description, price, categoryId, image, 
      isVeg, isBestseller, spiceLevel, prepTimeMinutes 
    } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');

    const result = await query(
      `INSERT INTO menu_items (
        name, slug, description, price, category_id, image,
        is_veg, is_bestseller, spice_level, prep_time_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name, slug, description || null, price, categoryId, image || null,
        isVeg || false, isBestseller || false, spiceLevel || 1, prepTimeMinutes || 20
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, message: 'Item with this name already exists' });
    }
    next(error);
  }
});

// Update menu item
router.put('/menu/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, description, price, categoryId, image, 
      isVeg, isBestseller, isAvailable, spiceLevel, prepTimeMinutes 
    } = req.body;

    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-') : undefined;

    const result = await query(
      `UPDATE menu_items SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        category_id = COALESCE($5, category_id),
        image = COALESCE($6, image),
        is_veg = COALESCE($7, is_veg),
        is_bestseller = COALESCE($8, is_bestseller),
        is_available = COALESCE($9, is_available),
        spice_level = COALESCE($10, spice_level),
        prep_time_minutes = COALESCE($11, prep_time_minutes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        name, slug, description, price, categoryId, image,
        isVeg, isBestseller, isAvailable, spiceLevel, prepTimeMinutes, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete menu item
router.delete('/menu/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    next(error);
  }
});

// Toggle item availability
router.patch('/menu/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE menu_items SET is_available = NOT is_available, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id, name, is_available`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============ CATEGORY MANAGEMENT ============

// Get all categories
router.get('/categories', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Add category
router.post('/categories', [
  body('name').notEmpty().withMessage('Name is required'),
], validate, async (req, res, next) => {
  try {
    const { name, description, image, sortOrder } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const result = await query(
      `INSERT INTO categories (name, slug, description, image, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, slug, description || null, image || null, sortOrder || 0]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update category
router.put('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, image, sortOrder, isActive } = req.body;
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined;

    const result = await query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        image = COALESCE($4, image),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active)
      WHERE id = $7 RETURNING *`,
      [name, slug, description, image, sortOrder, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============ ORDER MANAGEMENT ============

// Get all orders (online)
router.get('/orders', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        o.*, u.name as customer_name, u.phone as customer_phone,
        d.name as delivery_boy_name, 'online' as order_type
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN users d ON o.delivery_boy_id = d.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE o.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get all dine-in orders
router.get('/dine-in-orders', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        dio.*, 
        t.table_number,
        u.name as waiter_name,
        'dine_in' as order_type,
        (SELECT COUNT(*) FROM dine_in_order_items WHERE dine_in_order_id = dio.id) as items_count
      FROM dine_in_orders dio
      LEFT JOIN restaurant_tables t ON dio.table_id = t.id
      LEFT JOIN users u ON dio.waiter_id = u.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE dio.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY dio.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get items for each order
    const ordersWithItems = await Promise.all(result.rows.map(async (order) => {
      const itemsResult = await query(`
        SELECT dioi.*, mi.name as item_name
        FROM dine_in_order_items dioi
        LEFT JOIN menu_items mi ON dioi.menu_item_id = mi.id
        WHERE dioi.dine_in_order_id = $1
        ORDER BY dioi.created_at
      `, [order.id]);
      return { ...order, items: itemsResult.rows };
    }));

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    next(error);
  }
});

// Get single dine-in order details
router.get('/dine-in-orders/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const orderResult = await query(`
      SELECT 
        dio.*, 
        t.table_number,
        u.name as waiter_name
      FROM dine_in_orders dio
      LEFT JOIN restaurant_tables t ON dio.table_id = t.id
      LEFT JOIN users u ON dio.waiter_id = u.id
      WHERE dio.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const itemsResult = await query(`
      SELECT * FROM dine_in_order_items WHERE dine_in_order_id = $1 ORDER BY created_at
    `, [orderId]);

    res.json({ 
      success: true, 
      data: { 
        ...orderResult.rows[0], 
        items: itemsResult.rows 
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Update order status
router.put('/orders/:orderNumber/status', async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { status, deliveryBoyId, notes } = req.body;

    const orderResult = await query('SELECT id FROM orders WHERE order_number = $1', [orderNumber]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderId = orderResult.rows[0].id;

    // Build update query
    let updateSql = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status];

    if (deliveryBoyId) {
      params.push(deliveryBoyId);
      updateSql += `, delivery_boy_id = $${params.length}`;
    }

    params.push(orderId);
    updateSql += ` WHERE id = $${params.length} RETURNING *`;

    await query(updateSql, params);

    // Add to history
    await query(
      'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [orderId, status, notes || null, req.user.id]
    );

    // Emit socket events
    const io = req.app.get('io');
    io.to(`order_${orderNumber}`).emit('order_status', { status });
    
    if (deliveryBoyId) {
      io.to(`delivery_${deliveryBoyId}`).emit('new_assignment', { orderNumber });
    }

    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    next(error);
  }
});

// ============ DELIVERY BOY MANAGEMENT ============

// Get all delivery boys
router.get('/delivery-boys', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, is_active, created_at,
        (SELECT COUNT(*) FROM orders WHERE delivery_boy_id = users.id AND status = 'delivered') as total_deliveries
       FROM users WHERE role = 'delivery'
       ORDER BY name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Add delivery boy
router.post('/delivery-boys', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').isMobilePhone('en-IN').withMessage('Valid phone required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
], validate, async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, 'delivery')
       RETURNING id, name, email, phone, is_active`,
      [name, email, phone, hashedPassword]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    next(error);
  }
});

// Toggle delivery boy status
router.patch('/delivery-boys/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE users SET is_active = NOT is_active 
       WHERE id = $1 AND role = 'delivery'
       RETURNING id, name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Delivery boy not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get available delivery boys (for order assignment)
router.get('/delivery-boys/available', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, phone,
        (SELECT COUNT(*) FROM orders WHERE delivery_boy_id = users.id AND status IN ('ready', 'picked_up', 'on_the_way')) as active_orders
       FROM users 
       WHERE role = 'delivery' AND is_active = true
       ORDER BY active_orders, name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
