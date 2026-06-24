import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/scores',
        destination: '/dashboard/scores',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
