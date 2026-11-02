import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@klimacin/config",
    "@klimacin/shared",
    "@klimacin/ui",
  ],
};

export default nextConfig;
