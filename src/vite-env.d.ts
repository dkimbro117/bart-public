/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** When "true", expose AI settings and quiz-drafting UI. Default off for launch. */
  readonly VITE_FEATURE_AI?: string
  readonly VITE_ERROR_REPORT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
