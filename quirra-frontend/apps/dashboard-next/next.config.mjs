// apps/dashboard-next/next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = (
      process.env.QUIRRA_BACKEND || "https://quirra-api.onrender.com"
    ).replace(/\/+$/, "");

    return [
      {
        source: "/api/quirra/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;