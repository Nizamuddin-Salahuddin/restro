import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { query } from '../db/config.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { generateOTP } from '../utils/helpers.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register
router.post('/register', registerValidation, validate, async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, 'customer') 
       RETURNING id, name, email, phone, role`,
      [name, email, hashedPassword, phone || null]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', loginValidation, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT id, name, email, password, phone, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete user.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, role, avatar, address, latitude, longitude, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, address, latitude, longitude } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           phone = COALESCE($2, phone), 
           address = COALESCE($3, address),
           latitude = COALESCE($4, latitude),
           longitude = COALESCE($5, longitude),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, name, email, phone, role, address, latitude, longitude`,
      [name, phone, address, latitude, longitude, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], validate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current password
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
      [hashedPassword, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// Send OTP (Optional feature - scaffold)
router.post('/send-otp', [
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
], validate, async (req, res, next) => {
  try {
    const { phone } = req.body;
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await query(
      `UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE phone = $3`,
      [otp, expiresAt, phone]
    );

    // TODO: Integrate SMS provider (MSG91/Twilio) here
    // For now, just log the OTP in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 OTP for ${phone}: ${otp}`);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // Remove this in production!
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  } catch (error) {
    next(error);
  }
});

// Verify OTP (Optional feature - scaffold)
router.post('/verify-otp', [
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
], validate, async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const result = await query(
      `SELECT id, name, email, phone, role, otp_code, otp_expires_at 
       FROM users WHERE phone = $1 AND is_active = true`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Phone number not found' });
    }

    const user = result.rows[0];

    if (user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Clear OTP
    await query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1', [user.id]);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.otp_code;
    delete user.otp_expires_at;

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
