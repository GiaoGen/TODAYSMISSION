import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/landing-static" }],
      afterFiles: [],
      fallback: [],
    };
  },
  outputFileTracingIncludes: {
    "/landing-static": ["./design-prototypes/landing-static/index.html"],
    "/assets/characters/*": [
      "./design-prototypes/landing-static/assets/characters/*.png",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/seed/**",
      },
    ],
  },
};

export default nextConfig;
