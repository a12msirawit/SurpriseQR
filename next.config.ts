import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  compress: true,
  experimental: {
    middlewareClientMaxBodySize: "1024mb",
    serverActions: {
      bodySizeLimit: "1024mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "canvas-confetti",
      "qrcode.react",
    ],
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
