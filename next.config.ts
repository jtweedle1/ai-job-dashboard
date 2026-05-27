import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@anthropic-ai/sdk"],
};

export default nextConfig;
