/**
 * Rate Limiting Middleware
 * Protects sensitive endpoints from abuse and brute force attacks
 * Uses in-memory store (for production, consider Redis)
 */

// In-memory store for rate limiting
const requestStore = new Map();

/**
 * Clean up old entries periodically to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  const maxAge = 15 * 60 * 1000; // 15 minutes

  for (const [key, value] of requestStore.entries()) {
    if (now - value.firstRequest > maxAge) {
      requestStore.delete(key);
    }
  }
}, 60 * 1000); // Run cleanup every minute

/**
 * Rate limiter middleware factory
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.message - Error message to return
 * @returns {Function} Express middleware
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 100, // 100 requests per window default
    message = 'Too many requests, please try again later.',
  } = options;

  return (req, res, next) => {
    // Use IP address as key (in production, consider using user ID for authenticated routes)
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!requestStore.has(key)) {
      // First request from this IP
      requestStore.set(key, {
        count: 1,
        firstRequest: now,
        resetTime: now + windowMs,
      });
      return next();
    }

    const record = requestStore.get(key);

    // Reset if window has expired
    if (now > record.resetTime) {
      record.count = 1;
      record.firstRequest = now;
      record.resetTime = now + windowMs;
      return next();
    }

    // Increment request count
    record.count += 1;

    // Check if limit exceeded
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        message,
        retryAfter, // Seconds until retry is allowed
      });
    }

    next();
  };
};

/**
 * Strict rate limiter for authentication endpoints
 * More restrictive limits to prevent brute force attacks
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Only 5 login attempts per 15 minutes
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

/**
 * Moderate rate limiter for general API endpoints
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests. Please slow down.',
});

