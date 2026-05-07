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

/** Allow `next/image` to optimize remote URLs (closet uploads, avatars, mocks). */
function imageRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/v1/object/**",
    },
    {
      protocol: "https",
      hostname: "images.unsplash.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "lh3.googleusercontent.com",
      pathname: "/**",
    },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl) {
    try {
      const { hostname, protocol } = new URL(supabaseUrl);
      if (hostname && (protocol === "https:" || protocol === "http:")) {
        const proto = protocol === "http:" ? "http" : "https";
        const exists = patterns.some((p) => p.hostname === hostname && p.protocol === proto);
        if (!exists) {
          patterns.push({
            protocol: proto,
            hostname,
            pathname: "/storage/v1/object/**",
          });
        }
      }
    } catch {
      /* invalid env URL */
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageRemotePatterns(),
  },
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
