/**
 * Input Sanitization Middleware
 * Protects against XSS and NoSQL injection attacks
 * Sanitizes user input before processing
 */

import { body, validationResult } from 'express-validator';

/**
 * Sanitize string input
 * Removes potentially dangerous characters and trims whitespace
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip MongoDB operators to prevent NoSQL injection
    if (key.startsWith('$')) {
      continue;
    }
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Middleware to sanitize query parameters
 */
export const sanitizeQuery = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Validation and sanitization rules for common fields
 */
export const validationRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .trim()
    .withMessage('Invalid email address'),

  password: body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  title: body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .escape(), // Escape HTML characters

  content: body('content')
    .optional()
    .trim()
    .isLength({ max: 100000 })
    .withMessage('Content must be less than 100,000 characters'),

  name: body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters')
    .escape(),
};

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

