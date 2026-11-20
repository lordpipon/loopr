import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: { useTypeScriptCli: false, serverActions: { bodySizeLimit: "5mb" } },
  devIndicators: false,
  agentRules: false,
};

export default config;
