const withPWA = require('next-pwa')({
  dest: 'public',
  register: false,
  skipWaiting: true,
  sw: '/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
  },
}

module.exports = withPWA(nextConfig)
