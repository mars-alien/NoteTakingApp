/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images (if you add image support later)
  images: {
    domains: [],
    unoptimized: true, // Required for static export
  },

  // Code splitting configuration
  // Automatically splits code for better performance
  // Note: optimizeCss removed as it requires critters dependency

  // Compress responses
  compress: true,

  // Production optimizations
  swcMinify: true,

  // Static export (uncomment for static site generation)
  // output: 'export',

  // Environment variables that should be exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
