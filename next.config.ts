import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL || "http://localhost:4000";
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  // Docker / self-hosted environments need standalone output; Vercel handles its own serverless bundling.
  ...(isVercel ? {} : { output: "standalone" }),
  // Prevent runtime/local data from leaking into traces. Anchored to avoid matching node_modules/next/dist/**.
  outputFileTracingExcludes: {
    "*": ["./.data/**", "./.env*", "./.gstack/**", "./scripts/**"],
  },
  // The floating dev badge sits on top of the sidebar's Settings link.
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backend}/api/:path*`,
      },
      {
        source: "/api/vakil/:path*",
        destination: "/api/dots/:path*",
      },
      {
        source: "/api/legal/:path*",
        destination: `${backend}/api/legal/:path*`,
      },
    ];
  },
};

export default nextConfig;
