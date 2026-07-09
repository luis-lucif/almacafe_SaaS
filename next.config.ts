import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acceder al servidor de desarrollo desde el celular en la red local.
  allowedDevOrigins: ["192.168.1.35"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    // El middleware corre en /admin/products (POST de productos) y por
    // defecto solo deja pasar 10MB del body, aunque bodySizeLimit sea mayor.
    proxyClientMaxBodySize: "20mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nycdwzgkbstejuqxngog.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; img-src 'self' https://nycdwzgkbstejuqxngog.supabase.co data:; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; connect-src 'self' https://nycdwzgkbstejuqxngog.supabase.co; frame-ancestors 'none';`,
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
