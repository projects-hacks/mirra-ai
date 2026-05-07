import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";

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
      <head>
        {/* Material Symbols: ligature icons need this font + `.material-symbols-outlined` in globals.css */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Material Symbols not available via next/font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-x-hidden font-ui">
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
