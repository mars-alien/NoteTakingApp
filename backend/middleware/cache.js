/**
 * Response Caching Middleware
 * Implements HTTP caching headers for better performance
 * Reduces server load and improves response times
 */

/**
 * Cache middleware factory
 * @param {Object} options - Caching options
 * @param {number} options.maxAge - Cache duration in seconds
 * @param {boolean} options.private - Whether cache should be private
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (options = {}) => {
  const {
    maxAge = 300, // 5 minutes default
    private: isPrivate = true,
  } = options;

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Set cache headers
    if (isPrivate) {
      res.set('Cache-Control', `private, max-age=${maxAge}`);
    } else {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    }

    // Set ETag for cache validation (using request URL + timestamp)
    const etag = `"${Buffer.from(req.url + Date.now().toString()).toString('base64')}"`;
    res.set('ETag', etag);

    // Check if client has cached version
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).end(); // Not Modified
    }

    next();
  };
};

/**
 * No-cache middleware for sensitive endpoints
 * Ensures fresh data for authentication and user-specific endpoints
 */
export const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

