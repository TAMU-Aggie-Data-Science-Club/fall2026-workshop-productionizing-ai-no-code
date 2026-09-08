import type { NextConfig } from 'next';
import { BASE_PATH } from './lib/paths';

export default function nextConfig(phase: string): NextConfig {
  return {
    output: 'export',
    // The dev server handles the prefix; Vercel rewrites it for static builds.
    basePath: phase === 'phase-development-server' ? BASE_PATH : '',
  };
}
