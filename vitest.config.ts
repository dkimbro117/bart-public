import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    /**
     * src/lib/supabase.ts calls createClient at module scope. Without these
     * placeholders, import fails when VITE_SUPABASE_* is unset (typical CI).
     * Prefer vi.mock('./supabase') in suites that only need pure helpers —
     * on Node < 22 createClient also throws (no native WebSocket).
     *
     * Placeholders only. No test makes a network call.
     */
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
