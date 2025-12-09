import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validationRules, handleValidationErrors } from '../middleware/sanitize.js';

const router = express.Router();

// Apply strict rate limiting to authentication endpoints
// Prevents brute force attacks
router.use(authRateLimiter);

/**
 * Register new user
 * POST /api/auth/register
 * 
 * Validates email and password, creates new user account
 * Returns JWT token and user data
 */
router.post(
  '/register',
  [
    validationRules.email,
    validationRules.password,
    validationRules.name,
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Create user
      const user = new User({ email, password, name });
      await user.save();

      // Generate token
      const token = jwt.sign(
        { sub: user._id.toString(), email: user.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        access_token: token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  }
);

/**
 * Login user
 * POST /api/auth/login
 * 
 * Authenticates user with email and password
 * Returns JWT token and user data
 * Uses generic error message to prevent user enumeration
 */
router.post(
  '/login',
  [
    validationRules.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isValid = await user.comparePassword(password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { sub: user._id.toString(), email: user.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      res.json({
        access_token: token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  }
);

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  res.json(req.user);
});

export default router;

