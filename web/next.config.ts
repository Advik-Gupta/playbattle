import path from 'node:path';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '..'),
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_GAME_SERVER_URL:
      process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:4000',
  },
};

export default nextConfig;
