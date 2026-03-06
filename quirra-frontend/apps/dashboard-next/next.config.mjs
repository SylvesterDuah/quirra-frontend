// apps/dashboard-next/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = (
      process.env.QUIRRA_BACKEND || "http://127.0.0.1:8000"
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