import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false, // Üretim için 'false' olmalı
  },
  eslint: {
    ignoreDuringBuilds: false, // Üretim için 'false' olmalı
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add the Firebase Studio preview origin to allowedDevOrigins
  // to prevent cross-origin request errors during development.
  allowedDevOrigins: ['https://9000-firebase-studio-1748891728364.cluster-jbb3mjctu5cbgsi6hwq6u4btwe.cloudworkstations.dev'],
};

export default nextConfig;
