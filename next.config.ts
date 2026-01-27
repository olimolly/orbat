import type { NextConfig } from "next";

const repo = "orbat";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isProd ? `/${repo}` : "",
  // assetPrefix: `/${repo}/`,
};

export default nextConfig;
