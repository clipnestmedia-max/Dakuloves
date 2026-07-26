import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: isGithubPages ? "/Dakuloves" : undefined,
  assetPrefix: isGithubPages ? "/Dakuloves/" : undefined,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
