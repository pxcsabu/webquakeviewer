import path from 'node:path';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

function normalizeBase(raw: string | undefined): string {
  if (!raw || raw === '/') {
    return '/';
  }

  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return trimmed.length === 0 ? '/' : `/${trimmed}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cacheDirSetting =
    process.env.EARTHSCOPE_CACHE_DIR ??
    process.env.VITE_CACHE_DIR ??
    env.EARTHSCOPE_CACHE_DIR;
  const cacheDir = cacheDirSetting
    ? path.resolve(cacheDirSetting)
    : undefined;

  return {
    base: normalizeBase(
      process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH ?? '/',
    ),
    ...(cacheDir ? { cacheDir } : {}),
    plugins: [react()],
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
    test: {
      environment: 'node',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  };
});
