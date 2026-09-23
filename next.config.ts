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
    "/assets/showcase/*": [
      "./docs/design/packs/doing-things-alone/packcover/pack-cover.png",
      "./docs/design/packs/fear-of-rejection/packcover/00-pack-cover.png",
      "./docs/design/packs/talking-to-strangers/packcover/00-pack-cover-talking-to-strangers.png",
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
