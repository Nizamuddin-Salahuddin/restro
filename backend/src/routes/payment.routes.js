import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { query } from '../db/config.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post('/create-order', authenticate, async (req, res, next) => {
  try {
    const { orderNumber } = req.body;

    // Get order details
    const orderResult = await query(
      'SELECT id, total_amount, user_id FROM orders WHERE order_number = $1',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if payment already exists
    const existingPayment = await query(
      "SELECT razorpay_order_id FROM payments WHERE order_id = $1 AND status = 'pending'",
      [order.id]
    );

    if (existingPayment.rows.length > 0) {
      return res.json({
        success: true,
        data: { razorpayOrderId: existingPayment.rows[0].razorpay_order_id }
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total_amount * 100), // Amount in paise
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        orderNumber,
        userId: req.user.id,
      },
    });

    // Save payment record
    await query(
      `INSERT INTO payments (order_id, razorpay_order_id, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [order.id, razorpayOrder.id, order.total_amount]
    );

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify payment
router.post('/verify', authenticate, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderNumber } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Update payment record
    await query(
      `UPDATE payments 
       SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE razorpay_order_id = $3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // Update order status to confirmed
    const orderResult = await query(
      `UPDATE orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP 
       WHERE order_number = $1 RETURNING id`,
      [orderNumber]
    );

    if (orderResult.rows.length > 0) {
      await query(
        'INSERT INTO order_status_history (order_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
        [orderResult.rows[0].id, 'confirmed', 'Payment received', req.user.id]
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to('admin').emit('payment_received', { orderNumber });
    io.to(`order_${orderNumber}`).emit('order_status', { status: 'confirmed' });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { orderNumber, paymentId: razorpay_payment_id }
    });
  } catch (error) {
    next(error);
  }
});

// Razorpay webhook (for server-to-server confirmation)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const paymentId = payload.payment.entity.id;
      const orderId = payload.payment.entity.order_id;

      await query(
        `UPDATE payments SET status = 'paid', razorpay_payment_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE razorpay_order_id = $2`,
        [paymentId, orderId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get payment status
router.get('/status/:orderNumber', authenticate, async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    const result = await query(
      `SELECT p.status, p.razorpay_payment_id, p.amount, p.created_at
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.order_number = $1`,
      [orderNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
