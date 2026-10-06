/**
 * Self-hosted webfonts.
 *
 * These used to load from fonts.googleapis.com, which failed in production for
 * two independent reasons. The CSP in vercel.json allows neither
 * fonts.googleapis.com under style-src nor fonts.gstatic.com under font-src, so
 * every face was blocked outright — invisible locally, because vercel.json
 * headers do not apply to the dev server. And Google Fonts is a third-party
 * origin Workbox cannot precache, so an offline door tablet fell back to system
 * fonts regardless. Lexend carries the boy-facing screens, so that mattered.
 *
 * Bundling them makes the files same-origin (satisfying `font-src 'self'`) and
 * puts them in the precache via the woff2 glob in vite.config.ts.
 *
 * Latin subsets only, and only the weights index.css actually declares. Adding
 * a weight here without a matching rule there just ships bytes nobody renders.
 */

// --font-staff
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

// --font-kiosk
import '@fontsource/lexend/latin-400.css'
import '@fontsource/lexend/latin-700.css'

// --font-wordmark
import '@fontsource/libre-baskerville/latin-700.css'

// --font-stamp
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
