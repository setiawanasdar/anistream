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
};

export default nextConfig;
