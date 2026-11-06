import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && mode === 'production' && env.VITE_USE_MOCKS === 'true') {
    throw new Error('VITE_USE_MOCKS=true is not allowed in a production build.')
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
        manifest: {
          id: '/',
          name: 'JobApply Automation',
          short_name: 'JobApply',
          description:
            'Personal job application tracker and recruiter outreach from your own Google Sheet and Gmail.',
          start_url: '/?source=pwa',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#f6f6f8',
          background_color: '#f6f6f8',
          categories: ['productivity', 'business'],
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Applications',
              url: '/applications',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'New campaign',
              url: '/campaigns/new',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          // Only same-origin build assets. No runtime routes: Google APIs, tokens, and sheet data never reach Cache Storage.
          globPatterns: [
            '**/*.{js,css,html,svg,png,ico,webmanifest}',
            '**/*-latin-wght-normal-*.woff2',
            '**/*-latin-ext-wght-normal-*.woff2',
          ],
          globIgnores: ['**/logo.svg'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/_design/],
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
          runtimeCaching: [],
        },
        devOptions: { enabled: false },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
              },
              {
                name: 'shell',
                test: /src[\\/](app[\\/](navigation|ShellContext|useUiPrefs)|context[\\/](?!sheetSync)|lib[\\/](constants|utils|storage|mockMode)|pwa[\\/](installPrompt|useInstallPrompt|useOnlineStatus))|node_modules[\\/](clsx|tailwind-merge)[\\/]|lucide-react.*[\\/](briefcase-business|chart-column|file-text|rotate-ccw-clock|send|sheet)\.js/,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      css: false,
      // Route pages are lazy chunks; a cold transform under full-suite load can exceed 5 s.
      testTimeout: 15000,
    },
  }
})
