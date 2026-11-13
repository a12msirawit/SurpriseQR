import type { Metadata, Viewport } from "next";
import { Prompt, Kanit, Sarabun, Charm } from "next/font/google";
import "./globals.css";
import CosmicBackground from "@/components/shared/CosmicBackground";
import SiteTracker from "@/components/analytics/SiteTracker";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-prompt",
  display: "swap",
});

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-kanit",
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

const charm = Charm({
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
  variable: "--font-charm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SurpriseQR - Create Magical Surprise Cards",
  description: "Create and share interactive surprise greeting cards via QR code",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${prompt.className} ${prompt.variable} ${kanit.variable} ${sarabun.variable} ${charm.variable} min-h-screen antialiased`}>
        <CosmicBackground />
        {/* Global site traffic analytics (all routes, session-deduplicated) */}
        <SiteTracker />
        {children}
      </body>
    </html>
  );
}
