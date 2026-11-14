import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL || "http://localhost:4000";
const isVercel = Boolean(process.env.VERCEL);
const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy. Scripts allow 'unsafe-inline' because Next.js emits inline bootstrap
 * scripts; everything else is locked to this site, the Google Fonts the layout loads, and
 * data/blob URLs for generated previews. Framing and form targets are restricted outright.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Docker / self-hosted environments need standalone output; Vercel handles its own serverless bundling.
  ...(isVercel ? {} : { output: "standalone" }),
  poweredByHeader: false,
  // Prevent runtime/local data from leaking into traces. Anchored to avoid matching node_modules/next/dist/**.
  outputFileTracingExcludes: {
    "*": ["./.data/**", "./.env*", "./.gstack/**", "./scripts/**"],
  },
  // The floating dev badge sits on top of the sidebar's Settings link.
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      // Only the connectors and plugins settings screens talk to the backend directly (they rely on the
      // session cookie, which the backend checks against the database). Nothing else is exposed this way.
      { source: "/api/backend/connectors/:path*", destination: `${backend}/api/connectors/:path*` },
      { source: "/api/backend/connectors", destination: `${backend}/api/connectors` },
      { source: "/api/backend/plugins/:path*", destination: `${backend}/api/plugins/:path*` },
      { source: "/api/backend/plugins", destination: `${backend}/api/plugins` },
    ];
  },
};

export default nextConfig;
