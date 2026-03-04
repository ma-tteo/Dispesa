import type { NextConfig } from "next";

const isMobile = process.env.BUILD_MOBILE === 'true';

const nextConfig: NextConfig = {
  // Per Capacitor/Android, usa export statico
  // Per deployment web, usa standalone
  output: isMobile ? "export" : "standalone",

  // Configurazioni per export statico
  images: {
    unoptimized: true, // Necessario per export statico
  },

  // Trailing slash solo per mobile (static export)
  // Per web, non forzare trailing slash
  trailingSlash: isMobile,

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  transpilePackages: ['socket.io-client'],
};

export default nextConfig;
