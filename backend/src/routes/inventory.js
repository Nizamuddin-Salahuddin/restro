import express from 'express';
import { query } from '../db/config.js';
import { adminAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all inventory items with current stock
router.get('/items', adminAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, name, current_stock, unit, min_threshold,
        created_at, updated_at
      FROM inventory_items 
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory items'
    });
  }
});

// Update inventory item quantity
router.put('/items/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { current_stock } = req.body;

    if (current_stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    const result = await query(`
      UPDATE inventory_items 
      SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [current_stock, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory'
    });
  }
});

// Add new purchase
router.post('/purchases', adminAuth, async (req, res) => {
  try {
    const {
      item_name,
      quantity,
      unit,
      total_price,
      supplier_name,
      payment_status,
      payment_method,
      date
    } = req.body;

    // Validation
    if (!item_name || !quantity || !unit || !total_price || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (quantity <= 0 || total_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and price must be greater than 0'
      });
    }

    // Check if item exists, create if not
    let itemResult = await query(`
      SELECT id FROM inventory_items WHERE name = $1
    `, [item_name]);

    let itemId;
    if (itemResult.rows.length === 0) {
      // Create new item
      const newItemResult = await query(`
        INSERT INTO inventory_items (name, current_stock, unit)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [item_name, quantity, unit]);
      itemId = newItemResult.rows[0].id;
    } else {
      itemId = itemResult.rows[0].id;
      // Update existing item quantity
      await query(`
        UPDATE inventory_items 
        SET current_stock = current_stock + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [quantity, itemId]);
    }

    // Add purchase record
    const purchaseResult = await query(`
      INSERT INTO purchases (
        item_id, quantity, unit, total_price, 
        supplier_name, payment_status, payment_method, date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      itemId, quantity, unit, total_price,
      supplier_name || null, payment_status || 'pending',
      payment_method, date || new Date().toISOString().split('T')[0]
    ]);

    res.status(201).json({
      success: true,
      data: purchaseResult.rows[0],
      message: 'Purchase added successfully'
    });
  } catch (error) {
    console.error('Add purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add purchase'
    });
  }
});

// Get purchase history with filters
router.get('/purchases', adminAuth, async (req, res) => {
  try {
    const {
      item_name,
      date_filter, // today, week, month, custom
      start_date,
      end_date,
      payment_status,
      page = 1,
      limit = 50
    } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Item filter
    if (item_name) {
      whereConditions.push(`i.name ILIKE $${paramIndex}`);
      queryParams.push(`%${item_name}%`);
      paramIndex++;
    }

    // Date filters
    if (date_filter === 'today') {
      whereConditions.push(`p.date = CURRENT_DATE`);
    } else if (date_filter === 'week') {
      whereConditions.push(`p.date >= CURRENT_DATE - INTERVAL '7 days'`);
    } else if (date_filter === 'month') {
      whereConditions.push(`p.date >= CURRENT_DATE - INTERVAL '30 days'`);
    } else if (date_filter === 'custom' && start_date && end_date) {
      whereConditions.push(`p.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(start_date, end_date);
      paramIndex += 2;
    }

    // Payment status filter
    if (payment_status) {
      whereConditions.push(`p.payment_status = $${paramIndex}`);
      queryParams.push(payment_status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get filtered purchases
    const offset = (page - 1) * limit;
    const purchasesResult = await query(`
      SELECT 
        p.id, p.quantity, p.unit, p.total_price,
        p.supplier_name, p.payment_status, p.payment_method,
        p.date, p.created_at,
        i.name as item_name
      FROM purchases p
      JOIN inventory_items i ON p.item_id = i.id
      ${whereClause}
      ORDER BY p.date DESC, p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    // Get total expense for filtered data
    const totalResult = await query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(p.total_price), 0) as total_expense
      FROM purchases p
      JOIN inventory_items i ON p.item_id = i.id
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: {
        purchases: purchasesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalResult.rows[0].total_count),
          pages: Math.ceil(totalResult.rows[0].total_count / limit)
        },
        summary: {
          total_expense: parseFloat(totalResult.rows[0].total_expense)
        }
      }
    });
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get purchase history'
    });
  }
});

// Get daily stock log
router.get('/daily-log', adminAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const logDate = date || new Date().toISOString().split('T')[0];

    const result = await query(`
      SELECT 
        dsl.id, dsl.item_id, dsl.date,
        dsl.opening_stock, dsl.purchased_today, 
        dsl.used_today, dsl.closing_stock,
        i.name as item_name, i.unit
      FROM daily_stock_logs dsl
      JOIN inventory_items i ON dsl.item_id = i.id
      WHERE dsl.date = $1
      ORDER BY i.name ASC
    `, [logDate]);

    res.json({
      success: true,
      data: {
        date: logDate,
        logs: result.rows
      }
    });
  } catch (error) {
    console.error('Get daily log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get daily log'
    });
  }
});

// Update daily stock log
router.post('/daily-log', adminAuth, async (req, res) => {
  try {
    const { item_id, date, used_today } = req.body;

    if (!item_id || !date || used_today === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (used_today < 0) {
      return res.status(400).json({
        success: false,
        message: 'Used quantity cannot be negative'
      });
    }

    // Get or create daily log entry
    let logResult = await query(`
      SELECT * FROM daily_stock_logs 
      WHERE item_id = $1 AND date = $2
    `, [item_id, date]);

    let opening_stock = 0;
    let purchased_today = 0;

    if (logResult.rows.length === 0) {
      // Get previous day's closing stock for opening
      const prevDayResult = await query(`
        SELECT closing_stock FROM daily_stock_logs 
        WHERE item_id = $1 AND date < $2
        ORDER BY date DESC LIMIT 1
      `, [item_id, date]);

      opening_stock = prevDayResult.rows.length > 0 
        ? parseFloat(prevDayResult.rows[0].closing_stock)
        : 0;

      // Get today's purchases
      const purchasesResult = await query(`
        SELECT COALESCE(SUM(quantity), 0) as total_purchased
        FROM purchases 
        WHERE item_id = $1 AND date = $2
      `, [item_id, date]);

      purchased_today = parseFloat(purchasesResult.rows[0].total_purchased);
    } else {
      opening_stock = parseFloat(logResult.rows[0].opening_stock);
      purchased_today = parseFloat(logResult.rows[0].purchased_today);
    }

    const closing_stock = opening_stock + purchased_today - parseFloat(used_today);

    // Insert or update daily log
    const upsertResult = await query(`
      INSERT INTO daily_stock_logs 
        (item_id, date, opening_stock, purchased_today, used_today, closing_stock)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (item_id, date) 
      DO UPDATE SET 
        used_today = EXCLUDED.used_today,
        closing_stock = EXCLUDED.closing_stock,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [item_id, date, opening_stock, purchased_today, used_today, closing_stock]);

    // Update inventory current quantity
    await query(`
      UPDATE inventory_items 
      SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [closing_stock, item_id]);

    res.json({
      success: true,
      data: upsertResult.rows[0],
      message: 'Daily log updated successfully'
    });
  } catch (error) {
    console.error('Update daily log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update daily log'
    });
  }
});

export default router;