// Fail the production build before publishing a deployment with broken auth/data access.
if (process.env.VERCEL_ENV === "production") {
  const required = [
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "SUPABASE_PASSWORD_DB",
  ];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)?.trim())
    missing.push("AUTH_SECRET");
  if (missing.length)
    throw new Error(
      `Missing production environment variables: ${missing.join(", ")}`,
    );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  async redirects() {
    return [
      { source: "/logistic", destination: "/", permanent: true },
      { source: "/logistic/:path+", destination: "/:path+", permanent: true },
    ];
  },
  outputFileTracingIncludes: { "/*": ["./supabase/certs/prod-ca-2021.crt"] },
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:2020",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
