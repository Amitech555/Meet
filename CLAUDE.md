# Partants — conventions du projet

App mobile Expo (SDK 58, React Native 0.88, React 19) + Supabase. Montréal d'abord, français d'abord.
Plan, décisions et avancement : `ROADMAP.md`. Mise en route : `README.md`.

## Commandes
```bash
npm run typecheck      # tsc strict
npm run lint           # eslint (règles Expo + React Compiler + « pas de hex en dur »)
npm test               # jest (logique, i18n, contrastes)
npm run db:test        # supabase db reset + tests pgTAP + test de concurrence (Supabase local via Docker)
npm run e2e:web        # parcours principal de bout en bout (après npm run export:web)
npm run export:web && npm run screens -- /styleguide --full   # captures SE / grand / sombre
```
Toujours lancer typecheck + lint + test avant de committer.
`npx expo install <pkg>` pour ajouter une dépendance native (versions compatibles SDK). Sans réseau vers
api.expo.dev : `EXPO_OFFLINE=1 npx expo install <pkg>`.

## Arborescence
- `src/app/` — routes Expo Router uniquement (un fichier = un écran). Pas de logique métier ici.
- `src/features/<domaine>/` — `api.ts` (appels Supabase), `hooks.ts` (TanStack Query), `types.ts`.
- `src/components/ui/` — primitives du design system ; `src/components/session/` — composants métier.
- `src/stores/` — Zustand (préférences locales, auth, toasts). Les données serveur vont dans TanStack Query, jamais dans Zustand.
- `src/lib/` — utilitaires purs (temps, argent, géo, client Supabase).
- `design/tokens.ts` — **source unique** des couleurs, typo, espaces, rayons, durées.
- `supabase/migrations/` — schéma versionné. **Jamais** de changement de schéma sans nouvelle migration.

## Règles non négociables
- **Couleurs** : jamais de hex dans `src/` (règle eslint). Classes Tailwind (`bg-signal`, `text-ink`, `bg-tint-jaune`…) ou `useTheme().colors` pour les props non-style (icônes).
- **Texte** : aucune chaîne en dur dans l'UI — tout passe par `src/i18n/fr.json` + `en.json` (test de parité). Tutoiement, phrases courtes, pas de « ! » à répétition, pas de ton publicitaire.
- **Dates** : stockées en UTC (`timestamptz`), affichées via `src/lib/time.ts` (America/Toronto). Ne jamais formater une date ailleurs.
- **Rejoindre une session** : uniquement via la RPC `join_session` (verrou de ligne). Côté client : mise à jour optimiste + rollback.
- **Sécurité** : RLS sur toutes les tables ; toute écriture sensible passe par une fonction `security definer` qui revalide côté serveur.
- **Accessibilité** : zones tactiles ≥ 48 px (`min-h-tap`), `accessibilityLabel` sur tout élément interactif sans texte, état sélectionné annoncé, jamais d'info portée uniquement par la couleur, `Text` respecte la taille dynamique (`maxFontSizeMultiplier` 1.6).
- **Animations** : ressorts `springs` des tokens (200–350 ms) ; respecter `useReducedMotion()` (confettis/parallaxe coupés). Shared values : `.get()` / `.set()` (compatibles React Compiler).
- **Icônes** : Phosphor *bold*, importées une par une dans `src/components/ui/icons.ts` (pas d'import du barrel). Pas d'emoji dans l'UI (permis dans le chat).
- **Hors scope** : dating/swipe, fil social, stories, DM ouverts à tous, marketplace. Test : « est-ce que ça augmente le nombre de gens qui se retrouvent pour une activité ? » Sinon → backlog dans ROADMAP.md, pas de code.

## Expo 58 — points d'attention
- Onglets : `import { Tabs } from 'expo-router/js-tabs'` (l'export `Tabs` de `expo-router` est déprécié).
- Splash : `expo-splash-screen` directement.
- TypeScript 6 : `types` est explicite dans tsconfig (`jest`, `node`) ; pas de `baseUrl`.
- `react-native-worklets` : `scheduleOnRN` remplace `runOnJS`.
- MapLibre exige un *dev build* (`expo-dev-client`), pas Expo Go.

## Pièges déjà rencontrés
- Seed `auth.users` : les colonnes `*_token` doivent valoir `''` (pas NULL), sinon GoTrue refuse la connexion.
- Courriel de connexion : le gabarit doit contenir `{{ .Token }}` (code à 6 chiffres), sinon Supabase n'envoie qu'un lien magique.
- Realtime : un nom de canal unique par instance (`useId()`), sinon supabase-js lève une erreur quand un écran est monté deux fois.
- `join_session` utilise `clock_timestamp()` : `now()` est figé dans une transaction et casserait l'ordre de la liste d'attente.
- Mutations TanStack en `networkMode: 'always'` : hors-ligne, l'échec doit être immédiat (rollback), pas mis en pause.
- Edge Functions : pas de dépendance JSR/npm (mini-client REST dans `_shared/rest.ts`).
