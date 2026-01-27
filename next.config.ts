import type { NextConfig } from "next";

const repo = "orbat";
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? `/${repo}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },

  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",
};

export default nextConfig;
