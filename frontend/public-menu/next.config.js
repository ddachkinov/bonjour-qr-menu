/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
  },
  images: {
    domains: ['localhost', 's3.amazonaws.com'],
  },
};

module.exports = nextConfig;
