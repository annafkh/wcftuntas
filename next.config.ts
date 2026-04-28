import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app"],
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
