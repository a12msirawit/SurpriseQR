import type { Metadata, Viewport } from "next";
import { Prompt, Kanit, Sarabun } from "next/font/google";
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Kanit:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700;800&family=Sarabun:wght@300;400;500;600;700&family=Charm:wght@400;700&display=swap" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${prompt.className} ${prompt.variable} ${kanit.variable} ${sarabun.variable} min-h-screen antialiased`}>
        <CosmicBackground />
        {/* Global site traffic analytics (all routes, session-deduplicated) */}
        <SiteTracker />
        {children}
      </body>
    </html>
  );
}
