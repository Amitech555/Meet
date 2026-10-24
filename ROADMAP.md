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
| (b) | Schéma DB + RLS + fonctions + seed Montréal + tests pgTAP + connexion | ✅ fait |
| (c) | Onboarding + choix de ville + intérêts | ✅ fait |
| (d) | Feed Découvrir + filtres + carte + recherche | ✅ fait (carte native à valider sur appareil) |
| (e) | Détail de session + rejoindre/quitter + liste d'attente | ✅ fait |
| (f) | Créer une session | ✅ fait |
| (g) | Groupes + chat Realtime | ✅ fait |
| (h) | Profil + avis + check-in + Mes sessions | ✅ fait |
| (i) | Notifications | ⏳ en cours |

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

### (b) — fait
- 6 migrations : extensions (PostGIS, pg_trgm, unaccent), 17 tables, fonctions métier, API de lecture JSON, RLS + privilèges par colonne, Realtime, Storage, schéma paiements.
- `join_session` / `leave_session` : verrou `FOR UPDATE`, idempotent, file d'attente stricte (`clock_timestamp()`), +1 invité, promotion automatique + notification.
- Fonctions : `create_session` (récurrence, ville la plus proche, anti-spam 10/24 h), `cancel_session`, `duplicate_session`, `record_attendance`, `submit_reviews`, `reliability_score`, `join_group`, `delete_my_account` (Loi 25), `feed_sessions` (filtres, rayon PostGIS, recherche sans accents, curseur).
- Seed : Montréal + 21 catégories (12 familles + Autre + sous-catégories), 16 comptes de démo, 3 groupes, 22 sessions à venir, 6 passées avec présences et avis.
- Tests : 63 tests pgTAP (RLS table par table, liste d'attente, présence, avis) + `scripts/race-test.sh` (30 connexions simultanées sur 10 places → jamais de sur-réservation).
- Connexion : Apple (iOS), Google (OAuth PKCE), courriel (code à 6 chiffres), puis prénom + 18+ + conditions ; l'action mise de côté est rejouée.
- Analytics typés (PostHog, sans données sensibles) et drapeaux de fonctionnalités.

### (c) — fait
- 3 écrans (< 30 s) : bandeaux d'activités animés (immobiles si « réduire les animations »), ville (Montréal ouverte, Laval/Québec « Bientôt », géolocalisation facultative), grandes tuiles colorées ≥ 3 intérêts avec retour tactile. « Passer » partout → Montréal par défaut.
- Aucune connexion demandée : préférences locales, envoyées au serveur à l'inscription.

### (d) — fait
- Feed : une seule requête au chargement (sections « Ce soir près de toi », « Se remplit vite », « Pour toi » dérivées de la 1re page), puis fil chronologique paginé par curseur (FlashList).
- Filtres : catégories (parent inclut enfants), raccourcis de date, choix d'un jour, prix, niveau, distance (si position).
- « Je suis partant » directement sur la carte : mise à jour optimiste dans tous les caches, rollback + message humain, confirmation légère si payant.
- Vue carte MapLibre (marqueurs par teinte + carrousel synchronisé) ; repli explicite sur web.
- Recherche texte (P1) : activité, lieu, organisateur, insensible aux accents.
- Mesure `feed_loaded` (durée) pour la cible < 2 s.

### (e) — fait
- Détail : couverture avec parallaxe (coupée si « réduire les animations »), blocs Quand / Où / Qui, mini-carte + « Ouvrir dans Plans », carte de l'organisateur (fiabilité, sessions, vérifié), participants (+1 visibles), aperçu du chat réservé aux membres, politique d'annulation, bannières annulée / commencée / terminée.
- Barre collante : prix + « Je suis partant » → « Liste d'attente » si complet → « Tu y es ✓ » ; feuille de gestion : calendrier (dialogue système / .ics), inviter, +1 (migration 007 `set_guest`), se désister ; côté organisateur : appel, refaire la même, annuler avec message.
- Compteur de places en direct (Realtime) avec chiffre animé ; « Rejoindre toute la série ».
- Signalement de session ; liens universels `/s/<id>`.
- **Parcours principal testé de bout en bout** (`npm run e2e:web`, Supabase local + Mailpit) : feed anonyme en ~1,5 s → session → connexion par code → 18+ → inscription rejouée → « Tu y es ». Flux Maestro équivalent pour mobile (`e2e/maestro`).
- Bugs trouvés et corrigés par ce test : courriel sans code (gabarit FR avec `{{ .Token }}`), canal Realtime réutilisé au retour d'auth (écran blanc) → nom unique + ErrorBoundary global.

### (f) — fait
- Assistant Quoi → Quand → Où → Détails sur un seul flux, aperçu en direct de la carte en haut.
- Valeurs par défaut : prochain samedi 10 h, 90 min, 8 places, gratuit, tous niveaux, désistement souple.
- « Refaire une session passée » en premier choix (et « Refaire la même » depuis le détail : même heure, semaine suivante).
- Quand : 21 prochains jours, heures fréquentes + ajustement ±15 min, durées, récurrence hebdo / aux 2 semaines (occurrences créées côté serveur).
- Où : recherche Mapbox Geocoding biaisée Montréal, repli sur lieux connus sans jeton ; mini-carte du repère.
- Détails : places min/max (compteurs accessibles), niveau, prix (paiement sur place, Phase 2 Stripe), politique d'annulation, photo de couverture (Storage) ou couverture générée, publication dans un groupe dont on est admin.
- Validation client testée + revalidation serveur ; e2e : création publiée en ~3 s.

### (g) — fait
- Onglet Groupes : « Mes groupes » + « À découvrir » (cartes : couverture, rythme, prochaine session en évidence, membres).
- Écran de groupe : prochaine session en tête, calendrier groupé par jour, discussion, rejoindre / quitter / suivre, lien d'invitation unique `/g/<code>` à partager sur WhatsApp (import rapide d'un groupe existant), groupes privés verrouillés sans le lien.
- Créer un groupe (nom, activité, rythme, visibilité) ; l'admin peut publier des sessions dans le groupe.
- Chat (session et groupe) : temps réel (Realtime + RLS), envoi optimiste sans doublon, heure / date, signalement et suppression (auteur ou organisateur/admin), anti-spam 20 messages/min côté serveur.
- e2e : rejoindre un groupe puis message reçu en direct par un autre membre connecté dans un second navigateur.
- Bug corrigé : comptes de démo inutilisables en connexion par mot de passe (colonnes de jetons NULL dans le seed).

### (h) — fait
- Mes sessions : à venir / passées / j'organise, bannières « Fais l'appel » et « Donne ton avis », « Refaire la même ».
- Profil : avatar (Storage), ville, membre depuis, sessions jouées, présence %, sessions organisées, activités en pastilles, avis en tags agrégés (anonymes), prochaines sessions ; édition prénom/bio ; réglages langue (FR/EN), apparence, conditions, déconnexion, **suppression de compte** (Loi 25).
- Profil public : suivre un organisateur, bloquer / débloquer, signaler. Aucun message privé (hors scope).
- Après la session : « Qui était là ? » (tout coché, on décoche les absents) → avis 👍/👎 + tags en un tap par personne.
- e2e : appel (1 absent), avis, profil vérifiés en base.

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
| 13 | L'organisateur est inscrit d'office et compte dans `max_players` | Il joue aussi ; évite une session « vide » à la création. |
| 14 | Fiabilité = présents / (présents + absents), affichée à partir de 3 sessions pointées | Évite de juger quelqu'un sur une seule absence. |
| 15 | Compteurs `places_taken` / `waitlist_count` dénormalisés par trigger | Lecture anonyme et Realtime sans exposer la liste des inscrits. |
| 16 | Lectures via RPC JSON (une requête par écran) | Un aller-retour réseau, règles de visibilité centralisées en SQL. |
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
