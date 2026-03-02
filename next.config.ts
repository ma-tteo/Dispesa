import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Per Capacitor/Android, usa export statico
  // Per deployment web, usa standalone
  output: process.env.BUILD_MOBILE ? "export" : "standalone",

  // Configurazioni per export statico
  images: {
    unoptimized: true, // Necessario per export statico
  },

  trailingSlash: true, // Necessario per routing statico

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  transpilePackages: ['socket.io-client'],
};

export default nextConfig;
