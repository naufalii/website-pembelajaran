import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@fokussprints/shared"],
  reactStrictMode: true,
};

export default nextConfig;
