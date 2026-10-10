/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: { "/*": ["./supabase/certs/prod-ca-2021.crt"] },
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:2020',
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
