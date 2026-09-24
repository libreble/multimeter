/// <reference types="vitest/config" />
/// <reference types="node" />
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Web Bluetooth needs a secure context: localhost (dev) is fine; for phone testing
// over the LAN you'd need HTTPS. `host: true` exposes the dev server on the network.
//
// Hosted as a GitHub Pages project site at libreble.github.io/multimeter/, so
// `base` is the repo subpath and the service-worker scope + manifest start_url/scope all
// mirror it. (Switch to '/' + a CNAME only if it ever moves to a dedicated custom domain.)
// Self-hosters override it: `BASE_PATH=/ pnpm build` (the Docker image does this).
// Shown in the footer. Tag builds in CI use the tag (v1.2.0); elsewhere `git describe`
// (v1.2.0-3-gabc1234, or a bare sha on a shallow clone); `APP_VERSION` overrides; no git → "dev".
function appVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME)
    return process.env.GITHUB_REF_NAME;
  try {
    return execSync('git describe --tags --always', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = `/${(env.BASE_PATH || '/multimeter/').replace(/^\/+|\/+$/g, '')}/`.replace(
    '//',
    '/',
  );
  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(appVersion()) },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        // Generates 192/512 + maskable + apple-touch PNGs from the one SVG master and injects
        // the <link rel="apple-touch-icon"> tags and manifest icons array automatically.
        pwaAssets: { image: 'public/icon.svg', preset: 'minimal-2023' },
        manifest: {
          name: 'Multimeter — Bluetooth DMM logger',
          short_name: 'Multimeter',
          description:
            'Live readout, charting, recording and CSV/PNG export for Bluetooth multimeters (UNI-T UT60BT).',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'any',
          start_url: base,
          scope: base,
          categories: ['utilities', 'productivity'],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // SPA: serve the app shell for any in-scope navigation when offline.
          navigateFallback: `${base}index.html`,
        },
      }),
    ],
    server: { host: true },
    test: {
      environment: 'jsdom',
      // Node 25+ ships its own global localStorage (unusable without --localstorage-file), which
      // shadows jsdom's. Turn it off so tests get the jsdom one.
      execArgv: ['--no-experimental-webstorage'],
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        // Exclude entry point, generated types, and tests.
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      },
    },
  };
});
