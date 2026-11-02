import type { NextConfig } from "next";
import path from "node:path";
import { configuredDevHostnames } from "./src/lib/auth-origin";

const nextConfig: NextConfig = {
  allowedDevOrigins: configuredDevHostnames(process.env),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
