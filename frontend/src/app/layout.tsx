import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-noto-serif",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mirra — AI Appearance Operator",
  description: "Your closet. Your skin. Your context. One operator.",
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
  maximumScale: 1,
  userScalable: false,
  themeColor: "#c084fc",
  viewportFit: "cover", // For notched devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSerif.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">
        <AppProvider>{children}</AppProvider>

        {/* Perfect Corp JS Camera Kit (Disabled to prevent WebAssembly lag)
        <Script
          src="https://plugins-media.makeupar.com/v2.2-camera-kit/sdk.js"
          strategy="afterInteractive"
        /> */}

        {/* Service Worker Registration */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}

