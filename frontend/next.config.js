const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const isDev = process.env.NODE_ENV !== 'production';

// We dynamically construct the CSP based on environment.
// In development, Next.js requires 'unsafe-eval' for HMR to function.
// In production, we remove it to harden the application.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || ''} ${process.env.NEXT_PUBLIC_API_URL || ''} http://localhost:8085 ws://localhost:* wss://*;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    // Remove formatting newlines/excess spaces from the CSP string
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

if (!isDev) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  });
}

module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in the application
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
