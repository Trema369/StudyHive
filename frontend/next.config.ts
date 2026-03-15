import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  assetPrefix: 'https://studyhive.tremaz.dev',
  allowedDevOrigins: ['studyhive.tremaz.dev', 'tremaz.dev'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
