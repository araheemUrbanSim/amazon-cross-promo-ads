/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project site under /<repo>/. Override with VITE_BASE for another host (e.g. '/').
export default defineConfig({
  base: process.env.VITE_BASE ?? '/amazon-cross-promo-ads/',
  plugins: [react()],
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'], css: false }
});
