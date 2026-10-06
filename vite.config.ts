import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Avoid workbox terser flake that aborts SW generation on CI/Vercel.
      minify: false,
      includeAssets: ['bart-icon.svg', 'robots.txt'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        mode: 'development',
      },
      manifest: {
        name: 'B.A.R.T. — Boys Are Readers Too',
        short_name: 'B.A.R.T.',
        description:
          'Youth literacy program for boys — reading logs, quizzes, and chapter check-in.',
        theme_color: '#f3e6d0',
        background_color: '#f3e6d0',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/bart-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/bart-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
