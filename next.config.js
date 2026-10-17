// Canonical APP_URL resolution for Vercel, staging, and local environments
let appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();

if (!appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
  if (process.env.VERCEL) {
    const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    if (vercelHost) {
      appUrl = `https://${vercelHost.replace(/^https?:\/\//, "")}`;
    } else {
      appUrl = "https://market.prajnaa.in";
    }
    process.env.NEXT_PUBLIC_APP_URL = appUrl;
  } else if (process.env.NODE_ENV === "production") {
    appUrl = "https://market.prajnaa.in";
    process.env.NEXT_PUBLIC_APP_URL = appUrl;
  } else {
    appUrl = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = appUrl;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  serverExternalPackages: ["pdfkit", "jwks-rsa"],
  env: {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_RAZORPAY_KEY_ID: process.env.VITE_RAZORPAY_KEY_ID,
    VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_APP_URL: appUrl,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.firebasestorage.app",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.neon.tech",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/become-a-seller",
        destination: "/farmer-login",
        permanent: false,
      },
      {
        source: "/harvest",
        destination: "/shop",
        permanent: false,
      },
      {
        source: "/harvests",
        destination: "/shop",
        permanent: false,
      },
      {
        source: "/shop-harvest",
        destination: "/shop",
        permanent: false,
      },
      {
        source: "/shop_harvest",
        destination: "/shop",
        permanent: false,
      },
      {
        source: "/shop-the-harvest",
        destination: "/shop",
        permanent: false,
      },
      {
        source: "/shop/harvest",
        destination: "/shop",
        permanent: false,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
