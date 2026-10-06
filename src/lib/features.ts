export type FeatureId = 'ai'

/**
 * Launch feature flags (Phase 1 gate).
 * Unset / false = off. Set VITE_FEATURE_AI=true to enable AI UI.
 */
export function isFeatureEnabled(feature: FeatureId): boolean {
  if (feature === 'ai') {
    return import.meta.env.VITE_FEATURE_AI === 'true'
  }
  return false
}
