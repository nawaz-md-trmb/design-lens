/** @type {import('next').NextConfig} */
const nextConfig = {
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
