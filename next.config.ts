import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
