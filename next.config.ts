import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Tell Turbopack/webpack NOT to bundle these packages.
  // They must run natively in Node.js so process.env is available at runtime,
  // not at bundle-evaluation time. This fixes the DATABASE_URL being undefined issue.
  serverExternalPackages: [
    "@prisma/client",
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
    "@upstash/redis",
  ],
  // Next.js 15+ features
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
