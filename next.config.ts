import type { NextConfig } from "next";

const nextConfig = {
    experimental: {
      allowedDevOrigins: [
        'http://192.168.100.26:3000', // update to your dev host/port
        // add more origins as needed
      ],
    },
  };

export default nextConfig;
