import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";

const configuredApiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";

export const metadata: Metadata = {
  title: "Mirra — Skin, style, closet & try-on",
  description:
    "One guided selfie flow for skin analysis, face-aware GlowUp, wardrobe matching, and virtual try-on—with context and proof before you buy.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mirra",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#c084fc",
  viewportFit: "cover", // For notched devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-x-hidden font-ui">
        <Script id="api-origin-guard" strategy="beforeInteractive">
          {`
            (() => {
              const configuredApiOrigin = ${JSON.stringify(configuredApiOrigin)};
              if (!configuredApiOrigin || !window.fetch) return;

              let backendUrl;
              try {
                backendUrl = new URL(configuredApiOrigin);
              } catch {
                return;
              }

              const backendHosts = new Set([backendUrl.host]);
              const originalFetch = window.fetch.bind(window);

              window.fetch = (input, init) => {
                const rawUrl =
                  typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input && typeof input === 'object' && 'url' in input
                        ? input.url
                        : null;

                if (!rawUrl) return originalFetch(input, init);

                try {
                  const url = new URL(rawUrl, window.location.origin);
                  if (backendHosts.has(url.host) && url.pathname.startsWith('/api/')) {
                    const sameOriginPath = url.pathname + url.search + url.hash;
                    if (typeof input === 'string' || input instanceof URL) {
                      return originalFetch(sameOriginPath, init);
                    }
                    if (input instanceof Request) {
                      const requestInit = {
                        method: input.method,
                        headers: input.headers,
                        body: input.method === 'GET' || input.method === 'HEAD' ? undefined : input.clone().body,
                        mode: 'same-origin',
                        credentials: input.credentials,
                        cache: input.cache,
                        redirect: input.redirect,
                        referrer: input.referrer,
                        integrity: input.integrity,
                        keepalive: input.keepalive,
                        signal: input.signal,
                        ...init,
                      };
                      return originalFetch(new Request(sameOriginPath, requestInit));
                    }
                  }
                } catch {
                  return originalFetch(input, init);
                }

                return originalFetch(input, init);
              };
            })();
          `}
        </Script>

        <AppProvider>{children}</AppProvider>

        {/* Perfect Corp JS Camera Kit is dynamically injected by useCameraKit to ensure ymkAsyncInit is ready */}

        {/* Service Worker Registration */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                const isLocalhost =
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname === '::1';

                if (isLocalhost) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                      registration.unregister().catch(() => {});
                    });
                  });

                  if ('caches' in window) {
                    caches.keys().then((keys) => {
                      keys.forEach((key) => {
                        caches.delete(key).catch(() => {});
                      });
                    });
                  }

                  return;
                }

                navigator.serviceWorker
                  .register('/sw.js', { updateViaCache: 'none' })
                  .then((registration) => {
                    registration.update().catch(() => {});

                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                  })
                  .catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
