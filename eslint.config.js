// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*', 'screenshots/*'],
  },
  {
    rules: {
      // Pas de hex en dur dans les écrans : tout passe par design/tokens.ts
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
          message: 'Couleur en dur interdite : utilise design/tokens.ts (classes Tailwind ou useTheme()).',
        },
      ],
    },
  },
  {
    files: ['design/**', 'scripts/**', '**/__tests__/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
