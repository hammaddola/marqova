import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { MotionProvider } from "@/components/motion";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Marqova — See it. Trust it. Own it.", template: "%s · Marqova" },
  description: "Marqova is a premium marketplace for every niche — verified sellers, real reviews, full prices upfront, 3D view and virtual try-on.",
  applicationName: "Marqova",
  openGraph: { type: "website", siteName: "Marqova", locale: "en_PK", title: "Marqova — See it. Trust it. Own it." },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0E1A2B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only z-[100] rounded bg-navy-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
          Skip to content
        </a>
        <MotionProvider>{children}</MotionProvider>
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-inter)" } }} />
      </body>
    </html>
  );
}
