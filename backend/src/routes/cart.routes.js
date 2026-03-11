import express from 'express';
import { body } from 'express-validator';
import { query } from '../db/config.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// Get cart items
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
        ci.id, ci.quantity, ci.special_instructions,
        m.id as item_id, m.name, m.slug, m.price, m.image, m.is_veg, m.prep_time_minutes
      FROM cart_items ci
      JOIN menu_items m ON ci.menu_item_id = m.id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC`,
      [req.user.id]
    );

    // Calculate totals
    const items = result.rows;
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 0 ? 30 : 0;
    const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const total = subtotal + deliveryFee + tax;

    res.json({
      success: true,
      data: {
        items,
        summary: {
          subtotal,
          deliveryFee,
          tax,
          total,
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Add item to cart
router.post('/add', authenticate, [
  body('menuItemId').isInt().withMessage('Valid menu item ID required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
], validate, async (req, res, next) => {
  try {
    const { menuItemId, quantity = 1, specialInstructions } = req.body;

    // Check if item exists and is available
    const itemResult = await query(
      'SELECT id, name, is_available FROM menu_items WHERE id = $1',
      [menuItemId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (!itemResult.rows[0].is_available) {
      return res.status(400).json({ success: false, message: 'Item is currently unavailable' });
    }

    // Add or update cart item
    const result = await query(
      `INSERT INTO cart_items (user_id, menu_item_id, quantity, special_instructions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, menu_item_id) 
       DO UPDATE SET quantity = cart_items.quantity + $3, special_instructions = COALESCE($4, cart_items.special_instructions)
       RETURNING id`,
      [req.user.id, menuItemId, quantity, specialInstructions || null]
    );

    res.json({
      success: true,
      message: `${itemResult.rows[0].name} added to cart`,
      data: { cartItemId: result.rows[0].id }
    });
  } catch (error) {
    next(error);
  }
});

// Update cart item quantity
router.put('/update/:id', authenticate, [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
], validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, specialInstructions } = req.body;

    const result = await query(
      `UPDATE cart_items 
       SET quantity = $1, special_instructions = COALESCE($2, special_instructions)
       WHERE id = $3 AND user_id = $4
       RETURNING id`,
      [quantity, specialInstructions, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    next(error);
  }
});

// Remove item from cart
router.delete('/remove/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
});

// Clear cart
router.delete('/clear', authenticate, async (req, res, next) => {
  try {
    await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
});

export default router;
