/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images (if you add image support later)
  images: {
    domains: [],
  },

  // Code splitting configuration
  // Automatically splits code for better performance
  experimental: {
    // Enable modern bundling
    optimizeCss: true,
  },

  // Compress responses
  compress: true,

  // Production optimizations
  swcMinify: true,

  // Environment variables that should be exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
