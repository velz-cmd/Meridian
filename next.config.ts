import type { NextConfig } from "next";
import { MERIDIAN_SECURITY_HEADERS } from "./src/lib/site-security";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@circle-fin/x402-batching"],
  outputFileTracingIncludes: {
    "/api/bnb/demo": ["./bnb-hack/**/*"],
    "/api/nexus/conviction": ["./bnb-hack/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...MERIDIAN_SECURITY_HEADERS,
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_MERIDIAN_BUILD:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 7) ??
      "dev",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/coins/images/**",
      },
    ],
  },
};

export default nextConfig;
