import type { NextConfig } from "next";

const rawBackendOrigin = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000";

function normalizeBackendOrigin(rawOrigin: string) {
  const trimmed = rawOrigin.replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    const isLocal =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname === "[::1]";
    if (parsed.protocol === "http:" && !isLocal) {
      parsed.protocol = "https:";
    }
    return parsed.origin;
  } catch {
    return trimmed;
  }
}

const backendOrigin = normalizeBackendOrigin(rawBackendOrigin);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "upgrade-insecure-requests",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
