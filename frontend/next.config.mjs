/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from any domain (needed for anime poster scraping)
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    unoptimized: true,
  },
  // Suppress specific build warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow embedding third-party video players (vidsrc.me, vidsrc.pm, etc.)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src * data: blob:",
              "media-src * data: blob:",
              "frame-src *",
              "connect-src *",
              "font-src 'self' data:",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;

