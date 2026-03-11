import express from 'express';
import { query } from '../db/config.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all categories
router.get('/categories', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, slug, image, description FROM categories WHERE is_active = true ORDER BY sort_order'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get all menu items
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { category, veg, search, bestseller } = req.query;

    let sql = `
      SELECT 
        m.id, m.name, m.slug, m.description, m.price, m.image, 
        m.is_veg, m.is_bestseller, m.is_available, m.spice_level, m.prep_time_minutes,
        c.name as category_name, c.slug as category_slug
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.is_available = true
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      sql += ` AND c.slug = $${paramCount}`;
      params.push(category);
    }

    if (veg === 'true') {
      sql += ' AND m.is_veg = true';
    } else if (veg === 'false') {
      sql += ' AND m.is_veg = false';
    }

    if (bestseller === 'true') {
      sql += ' AND m.is_bestseller = true';
    }

    if (search) {
      paramCount++;
      sql += ` AND (m.name ILIKE $${paramCount} OR m.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY m.is_bestseller DESC, c.sort_order, m.name';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single menu item
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const result = await query(
      `SELECT 
        m.id, m.name, m.slug, m.description, m.price, m.image, 
        m.is_veg, m.is_bestseller, m.is_available, m.spice_level, m.prep_time_minutes,
        c.name as category_name, c.slug as category_slug
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get bestsellers
router.get('/featured/bestsellers', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
        m.id, m.name, m.slug, m.description, m.price, m.image, 
        m.is_veg, m.is_bestseller, m.spice_level, m.prep_time_minutes,
        c.name as category_name
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.is_bestseller = true AND m.is_available = true
      ORDER BY m.name
      LIMIT 8`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
