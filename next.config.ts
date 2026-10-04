import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // The repository root is one level above the app, so Turbopack needs to be
  // told where the project actually begins or it walks up to /home/korebear.
  turbopack: {
    root: process.cwd(),
  },
  // The prototype loads Montserrat and Archivo Black from Google Fonts. Keep the
  // same faces so canvas measureText and CSS agree with the mockup.
  images: {
    formats: ['image/webp'],
  },
};

export default nextConfig;