import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app"],
  images: {
    qualities: [72, 75],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
