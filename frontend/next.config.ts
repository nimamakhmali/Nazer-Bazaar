import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname:  "localhost",
        port:      "8000",
        pathname:  "/media/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  env: {
    NEXT_PUBLIC_APP_NAME:    "سامانه پایش قیمت کالا",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
  },

  // Bundle analyzer (npm run analyze)
  ...(process.env.ANALYZE === "true" && {
    // @ts-ignore
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
        config.plugins.push(
          new BundleAnalyzerPlugin({ analyzerMode: "static", openAnalyzer: false })
        );
      }
      return config;
    },
  }),
};

export default nextConfig;