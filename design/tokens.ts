/**
 * Source unique du design system Partants.
 * Aucun écran ne doit contenir de hex en dur : tout passe par ces tokens,
 * soit via les classes Tailwind (tailwind.config.js), soit via useTheme().
 */

export const palette = {
  warmWhite: '#FAF7F2',
  white: '#FFFFFF',
  ink: '#14110F',
  inkSoft: '#6B645C',
  line: '#E7E1D8',
  signal: '#FF4F1A',
  signalPressed: '#E63F0D',
  citron: '#D9FF3F',
  night: '#1B2A41',
  danger: '#C8261B',
  success: '#1E7A46',
  // Mode sombre
  darkBg: '#0F0E0D',
  darkSurface: '#1A1816',
  darkSurfaceRaised: '#24211E',
  darkText: '#F4EFE8',
  darkTextSoft: '#A39B91',
  darkLine: '#2E2A26',
} as const;

export type ColorScheme = 'light' | 'dark';

/** Couleurs sémantiques par thème. Les clés deviennent des classes : bg-bg, text-ink, border-line… */
export const themes = {
  light: {
    bg: palette.warmWhite,
    surface: palette.white,
    surfaceAlt: '#F1ECE4',
    ink: palette.ink,
    inkSoft: palette.inkSoft,
    line: palette.line,
    signal: palette.signal,
    signalPressed: palette.signalPressed,
    onSignal: palette.ink,
    citron: palette.citron,
    onCitron: palette.ink,
    night: palette.night,
    onNight: palette.white,
    danger: palette.danger,
    success: palette.success,
    overlay: 'rgba(20,17,15,0.45)',
  },
  dark: {
    bg: palette.darkBg,
    surface: palette.darkSurface,
    surfaceAlt: palette.darkSurfaceRaised,
    ink: palette.darkText,
    inkSoft: palette.darkTextSoft,
    line: palette.darkLine,
    signal: palette.signal,
    signalPressed: palette.signalPressed,
    onSignal: palette.ink,
    citron: palette.citron,
    onCitron: palette.ink,
    night: '#22344F',
    onNight: palette.white,
    danger: '#FF6B5E',
    success: '#4CC283',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeColors = { [K in keyof (typeof themes)['light']]: string };
export type ThemeColorName = keyof ThemeColors;

/**
 * Teintes de catégories. La table `categories` référence une clé (`tint`),
 * ce qui permet d'ajouter des catégories sans toucher au code.
 * `fg` = couleur du texte/pictogramme posé sur la teinte (contraste AA vérifié en test).
 */
export const categoryTints = {
  orange: { bg: '#F7782B', fg: palette.ink, pattern: '#FFB27A' }, // course & marche
  jaune: { bg: '#FFC629', fg: palette.ink, pattern: '#FFE08A' }, // basket / sport collectif
  mousse: { bg: '#56651D', fg: palette.white, pattern: '#7C8D3A' }, // golf
  terracotta: { bg: '#A9472A', fg: palette.white, pattern: '#CC6A4A' }, // équitation
  turquoise: { bg: '#14A39E', fg: palette.ink, pattern: '#5FD0CB' }, // raquette
  encre: { bg: '#22336B', fg: palette.white, pattern: '#3A4F92' }, // jeux de société
  sapin: { bg: '#1E5A3C', fg: palette.white, pattern: '#33805A' }, // plein air
  ciel: { bg: '#5BB8EA', fg: palette.ink, pattern: '#9AD6F5' }, // vélo
  menthe: { bg: '#9ED9C4', fg: palette.ink, pattern: '#C6EEDF' }, // fitness & yoga
  rouge: { bg: '#C42A3A', fg: palette.white, pattern: '#E05563' }, // sports de combat
  electrique: { bg: '#2F5BFF', fg: palette.white, pattern: '#6C8BFF' }, // jeux vidéo
  framboise: { bg: '#F0608E', fg: palette.ink, pattern: '#F79BB8' }, // créatif
  sable: { bg: '#CBBFAE', fg: palette.ink, pattern: '#E2D9CC' }, // autre
} as const;

export type CategoryTint = keyof typeof categoryTints;
export const DEFAULT_TINT: CategoryTint = 'sable';

export function tintFor(key: string | null | undefined) {
  return categoryTints[(key as CategoryTint) ?? DEFAULT_TINT] ?? categoryTints[DEFAULT_TINT];
}

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodySemibold: 'Geist_600SemiBold',
  bodyBold: 'Geist_700Bold',
} as const;

/** Échelle typographique imposée : 12 / 14 / 16 / 20 / 28 / 40 */
export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const lineHeights = {
  xs: 16,
  sm: 20,
  md: 22,
  lg: 26,
  xl: 32,
  xxl: 42,
} as const;

/** Grille de 4 pt */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radii = {
  none: 0,
  field: 12,
  card: 20,
  pill: 999,
} as const;

export const durations = {
  fast: 200,
  base: 260,
  slow: 350,
  confetti: 600,
} as const;

/** Ressorts Reanimated : 200–350 ms, sans rebond excessif. */
export const springs = {
  snappy: { damping: 20, stiffness: 320, mass: 0.8 },
  gentle: { damping: 22, stiffness: 180, mass: 1 },
} as const;

/** Zone tactile minimale (accessibilité) */
export const hitTarget = 48;

/** Seule ombre autorisée : bouton « Créer » et barres collantes. */
export const elevation = {
  raised: {
    shadowColor: palette.ink,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sticky: {
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
} as const;

/** Convertit #RRGGBB en "R G B" pour les variables CSS de NativeWind. */
export function hexToRgbChannels(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
