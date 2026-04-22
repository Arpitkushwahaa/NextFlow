import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Disable Turbopack for local Windows builds (symlink privilege issue)
  experimental: {},
};

export default nextConfig;
