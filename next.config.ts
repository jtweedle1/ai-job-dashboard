import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "@anthropic-ai/sdk"],
};

export default nextConfig;
