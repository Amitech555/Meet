import type { Config } from 'tailwindcss';
import { categoryTints, fontSizes, lineHeights, radii, space, fonts, themes } from './design/tokens';

// Les couleurs sémantiques pointent vers des variables CSS injectées par <ThemeProvider>
// (voir src/design/ThemeProvider.tsx) : un seul jeu de classes pour clair et sombre.
const semantic = Object.fromEntries(
  Object.keys(themes.light)
    .filter((k) => k !== 'overlay')
    .map((k) => [k, `rgb(var(--c-${k}) / <alpha-value>)`]),
);

const tints = Object.fromEntries(
  Object.entries(categoryTints).map(([k, v]) => [k, { DEFAULT: v.bg, fg: v.fg, pattern: v.pattern }]),
);

const px = (o: Record<string | number, number>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, `${v}px`]));

export default {
  content: ['./src/**/*.{ts,tsx}'],
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- preset CommonJS
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    colors: { transparent: 'transparent', ...semantic, tint: tints },
    spacing: px(space),
    borderRadius: px(radii),
    fontSize: Object.fromEntries(
      Object.entries(fontSizes).map(([k, v]) => [
        k,
        [`${v}px`, { lineHeight: `${lineHeights[k as keyof typeof lineHeights]}px` }],
      ]),
    ),
    fontFamily: {
      display: [fonts.display],
      'display-bold': [fonts.displayBold],
      body: [fonts.body],
      medium: [fonts.bodyMedium],
      semibold: [fonts.bodySemibold],
      bold: [fonts.bodyBold],
    },
    extend: {
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
    },
  },
  plugins: [],
} satisfies Config;
