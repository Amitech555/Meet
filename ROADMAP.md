# ROADMAP — Partants

> Une app pour jouer ensemble à Montréal : trouver, créer, rejoindre et refaire des activités en personne.
> Pas une app de rencontre. Mélange de ClassPass (réserver une place) et GoodRec (trouver des gens pour jouer).

## Architecture

```
App Expo (iOS/Android)  ──supabase-js──▶  Supabase
  Expo Router (routes)                     ├─ Postgres + PostGIS + RLS
  TanStack Query (données serveur)         ├─ RPC : join_session, leave_session, feed_sessions,
  Zustand (préférences, auth différée)     │        reliability_score, complete_profile…
  NativeWind ◀── design/tokens.ts          ├─ Realtime (chat session/groupe, compteur de places)
  i18next (fr-CA par défaut, en)           ├─ Storage (avatars, couvertures)
                                           ├─ pg_cron → Edge Functions (rappels 24 h / 2 h, check-in)
                                           └─ Edge Functions : share (page OG), stripe-webhook (Phase 2)
PostHog (analytics + feature flags) · Sentry · Mapbox Geocoding · MapLibre (tuiles OpenFreeMap)
```

## Avancement

| Étape | Contenu | État |
|---|---|---|
| (a) | Setup Expo 58 + NativeWind + design system + `/styleguide` + navigation | ✅ fait |
| (b) | Schéma DB + RLS + fonctions + seed Montréal + tests pgTAP | ⏳ en cours |
| (c) | Onboarding + choix de ville + intérêts | à faire |
| (d) | Feed Découvrir + filtres + carte | à faire |
| (e) | Détail de session + rejoindre/quitter + liste d'attente | à faire |
| (f) | Créer une session | à faire |
| (g) | Groupes + chat Realtime | à faire |
| (h) | Profil + avis + check-in | à faire |
| (i) | Notifications | à faire |

### (a) — fait
- Expo SDK 58 / RN 0.88 / React 19, Expo Router (routes dans `src/app`), TypeScript strict.
- `design/tokens.ts` : palette, 13 teintes de catégories (contraste AA testé), échelle 12/14/16/20/28/40, grille 4 pt, rayons 20/12/999, ressorts.
- Thème clair/sombre par variables CSS NativeWind générées depuis les tokens (un seul jeu de classes).
- Composants : Text, Button, IconButton, Pill, CategoryChip, PriceBadge, SpotsBadge, Avatar, AvatarStack, Sheet, Skeleton, SessionCardSkeleton, EmptyState, ErrorState, Toast, Confetti, AnimatedNumber, SessionCard (compacte / mise en avant / carrousel), GeneratedCover, TimeBlock, JoinButton.
- Barre d'onglets Découvrir · Mes sessions · [+] · Groupes · Profil avec bouton central surélevé.
- Auth différée (`useRequireAuth`) : l'action est mémorisée puis rejouée après connexion.
- i18n FR/EN complet (test de parité des clés + test anti-ton publicitaire).
- `lib/time.ts` testé (UTC ↔ America/Toronto, changement d'heure du 1er novembre).
- Script de captures Playwright (iPhone SE, grand écran, sombre) sur l'export web.

## Décisions

| # | Décision | Raison |
|---|---|---|
| 1 | `join_session` / `leave_session` en `security definer` avec `SELECT … FOR UPDATE` sur la session | Impossible de dépasser `max_players` même avec deux clics simultanés ; promotion de la liste d'attente dans la même transaction. |
| 2 | Lecture anonyme des sessions publiées + vue `public_profiles` réduite | Explorer sans compte (règle d'or conversion) tout en minimisant les données exposées (Loi 25). |
| 3 | Date de naissance vérifiée côté serveur puis **non conservée** (`adult_confirmed_at`) | 18+ obligatoire, minimisation des données. |
| 4 | UTC en base, affichage America/Toronto via un seul module | Évite les bugs de fuseau et de changement d'heure. |
| 5 | Récurrence : `recurrence_rule` (RRULE) + `series_id`, occurrences générées 8 semaines à l'avance | Chaque occurrence est une vraie session (places, chat, présence) ; permet « rejoindre toute la série ». |
| 6 | Paiements : schéma prêt (`payments`, `payout_accounts`, `platform_settings.commission_bps`), flag `payments_enabled` coupé | Phase 2 sans migration destructive ; en attendant, paiement sur place. |
| 7 | Pas de DM dans le MVP | Le chat de session/groupe couvre le besoin ; un DM futur passera par `shares_session(a, b)`. |
| 8 | Polices : Bricolage Grotesque (titres) + **Geist** (texte) | Geist disponible dans expo-google-fonts. |
| 9 | MapLibre + tuiles OpenFreeMap (sans clé) ; Mapbox seulement pour le géocodage | Coût nul pour les tuiles, pas de verrou fournisseur. Exige un dev build. |
| 10 | Texte des boutons orange en **encre**, pas en blanc | Blanc sur `#FF4F1A` = 3,1:1, sous le seuil AA pour du 16 px ; encre = 6,1:1. |
| 11 | Session persistée dans AsyncStorage | Les jetons Supabase dépassent la limite de 2 ko de SecureStore (recommandation officielle Supabase). |
| 12 | Transitions partagées carte → détail : remplacées par un fondu + parallaxe | Les shared element transitions de Reanimated 4 sont encore expérimentales ; on réévaluera. |

## Backlog

### P1 (après le P0, sans validation)
- Recherche texte + favoris
- Partage par lien (deep link + page OG)
- Rappels 24 h / 2 h, rappel de check-in, place libérée
- Ajout au calendrier (.ics)
- Sessions récurrentes + « rejoindre toute la série »
- Invitation d'amis, « amener un invité » (+1)
- Annulation par l'organisateur avec notification
- « Refaire la même » en un tap
- Suivre un organisateur / un groupe
- Lecture hors-ligne des sessions déjà vues

### P2 (à proposer avant de coder)
- Tableau de bord organisateur, badges et séries, suggestions personnalisées, tournois et ligues,
  co-organisateurs, pages Lieux/Organisations vérifiées, back-office admin web.

### Phase 2 (architecture prévue)
- Stripe Connect Express, commission paramétrable, remboursements selon la politique, webhooks via Edge Functions.
- Partenaires pro (golf, écuries, studios), abonnement premium.
