/** Chapter brand colors — source of truth for docs and tests. */
export const brandColors = {
  chapterCrimson: '#8B0000',
  shelvingCream: '#F3E6D0',
  readersInk: '#1C1410',
  marginWhite: '#FFFEF8',
  bookmarkGold: '#B8860B',
  dueDateGreen: '#2F6B4F',
  crimson: {
    300: '#D46666',
    500: '#A50000',
    600: '#8B0000',
    700: '#6E0000',
    800: '#520000',
    950: '#2D0000',
  },
  cream: {
    50: '#F3E6D0',
    100: '#FAF4E8',
    200: '#E5D4BC',
    300: '#D4C4A8',
  },
  ink: {
    900: '#1C1410',
    700: '#3D342F',
    500: '#6B5E55',
    400: '#8A7B70',
  },
} as const

export const designShadows = {
  card: '0 4px 24px rgba(45, 0, 0, 0.06)',
  nav: '0 8px 32px rgba(45, 0, 0, 0.12)',
} as const

export const designRadius = {
  card: '20px',
  btn: '14px',
  input: '12px',
} as const

export const semanticTokens = {
  primary: 'crimson-600',
  primaryHover: 'crimson-700',
  kioskBg: 'cream-50',
  kioskHighlight: 'cream-100',
  surfaceCanvas: 'cream-50',
  surfaceCard: 'margin-white',
  surfaceHighlight: 'cream-100',
  borderDefault: 'cream-200',
  textPrimary: 'ink-900',
  textMuted: 'ink-700',
  navBar: 'crimson-950',
  navActive: 'crimson-600',
  reward: 'bookmark-gold',
  success: 'due-date-green',
} as const
