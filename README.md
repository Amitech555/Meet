# Partants

App mobile pour **jouer ensemble à Montréal** : trouver une activité ce soir, rejoindre une place en deux taps,
lancer sa propre session en moins de deux minutes. Basket au parc, course sur le canal, soirée de jeux, golf, équitation…

Stack : Expo SDK 58 (React Native 0.88, Expo Router) · TypeScript strict · Supabase (Postgres + PostGIS, Auth,
Realtime, Storage, RLS) · TanStack Query + Zustand · NativeWind · Reanimated · i18next (fr-CA / en).

- Conventions : [`CLAUDE.md`](CLAUDE.md)
- Plan, décisions, avancement : [`ROADMAP.md`](ROADMAP.md)
- Design system : [`design/tokens.ts`](design/tokens.ts) et l'écran caché `/styleguide`

## Prérequis

- Node 22+, npm 10+
- Docker (pour Supabase en local) et la CLI Supabase : `npx supabase --version`
- Pour iOS : Xcode 16+ ; pour Android : Android Studio. La carte (MapLibre) exige un **dev build** — Expo Go ne suffit pas.

## Mise en route

```bash
npm install
cp .env.example .env          # puis remplir les valeurs (voir ci-dessous)

# Base locale
npx supabase start            # démarre Postgres, Auth, Realtime, Storage
npm run db:reset              # applique les migrations + le seed Montréal
npx supabase status           # copie API URL et anon key dans .env

# App
npx expo run:ios              # ou: npx expo run:android  (dev build, nécessaire pour la carte)
npm run web                   # aperçu web rapide (sans carte native)
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Projet Supabase (la clé anon est publique ; la sécurité repose sur la RLS) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Géocodage d'adresses (jeton public `pk.*`) |
| `EXPO_PUBLIC_MAP_STYLE_URL` | Style de carte MapLibre (OpenFreeMap par défaut, sans clé) |
| `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_SENTRY_DSN` | Analytics et crashs (optionnels en dev) |
| `EXPO_PUBLIC_SHARE_BASE_URL` | Domaine des liens de partage |

Aucun secret dans le dépôt : les clés serveur (Stripe, Expo push) vont dans `supabase secrets set`.

## Scripts

| Commande | Effet |
|---|---|
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint (Expo + React Compiler + interdiction des couleurs en dur) |
| `npm test` | Tests Jest (temps/fuseau, argent, i18n, contrastes AA, logique métier) |
| `npm run db:test` | Migrations + seed + tests pgTAP (RLS, concurrence sur la dernière place, liste d'attente) |
| `npm run db:reset` | Réinitialise la base de dev avec le seed |
| `npm run export:web && npm run screens -- /styleguide --full` | Captures iPhone SE / grand écran / sombre dans `screenshots/` |

## Structure

```
src/app/            routes Expo Router (écrans)
src/features/       logique par domaine (api, hooks TanStack Query, types)
src/components/     ui/ (design system) et session/ (composants métier)
src/stores/         Zustand (préférences, auth différée, toasts)
src/lib/            utilitaires (temps, argent, géo, client Supabase)
src/i18n/           fr.json, en.json
design/tokens.ts    source unique du design
supabase/           migrations, seed, tests pgTAP, Edge Functions
scripts/            captures, reset de la base
```
