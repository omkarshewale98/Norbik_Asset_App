import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode : false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  /* config options here */
  // appDir: true,
    async redirects() {
    return [
      {
        source: "/",
        destination: "/sign-in",
        permanent: false, // change to true if you want a 308 permanent redirect
      },
    ];
  },
};

export default nextConfig;