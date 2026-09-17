/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Cloudflare quick tunnels (*.trycloudflare.com) to load dev assets
  allowedDevOrigins: ['*.trycloudflare.com'],
  experimental: {
    serverComponentsExternalPackages: [
      'sharp',
      'playwright',
      'playwright-core',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('playwright');
    }
    return config;
  },
};

export default nextConfig;
