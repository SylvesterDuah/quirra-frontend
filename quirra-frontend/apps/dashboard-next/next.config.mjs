/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/quirra/:path*",
        destination: `${process.env.QUIRRA_BACKEND || "http://127.0.0.1:8000"}/:path*`
      }
    ];
  }
};

export default nextConfig;
