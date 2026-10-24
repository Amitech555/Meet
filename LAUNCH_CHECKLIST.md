# Checklist de mise en production

## Comptes et outils
- [ ] Apple Developer Program (99 $ US/an) — identifiant `app.partants.mobile`, capacité *Sign in with Apple*, *Push Notifications*, *Associated Domains* (`applinks:partants.app`).
- [ ] Google Play Console (25 $ US) — paquet `app.partants.mobile`, empreinte SHA-256 du certificat de signature → `ANDROID_CERT_SHA256` (Edge Function `share`).
- [ ] Projet EAS (`npx eas-cli init`) → `extra.eas.projectId` dans app.json (requis pour les jetons push Expo) ; profils `development`, `preview`, `production` dans `eas.json`.
- [ ] Supabase (région `ca-central-1`, Montréal — données au Québec/Canada, Loi 25), plan Pro (sauvegardes PITR).
- [ ] Mapbox (jeton public `pk.*` restreint aux identifiants d'app), PostHog (instance US ou EU), Sentry (projet React Native + upload des sourcemaps EAS).
- [ ] Domaine `partants.app` : réécrire `/s/*`, `/g/*` et `/.well-known/*` vers l'Edge Function `share`.

## Supabase (production)
- [ ] `supabase link` puis `supabase db push` (11 migrations). **Jamais** le seed en prod.
- [ ] Auth : fournisseurs Apple (Service ID + clé .p8) et Google (ID client Web + iOS/Android), courriel avec gabarit **code à 6 chiffres** (`supabase/templates/code.html`, sujet « Ton code Partants : {{ .Token }} »), expiration 10 min, SMTP transactionnel (Postmark / Resend) avec SPF/DKIM.
- [ ] Redirections autorisées : `partants://`, `https://partants.app`.
- [ ] Vault : `project_url` et `service_role_key` (envoi push par pg_cron) ; `supabase secrets set EXPO_ACCESS_TOKEN=… APPLE_TEAM_ID=… ANDROID_CERT_SHA256=… APP_STORE_URL=… PLAY_STORE_URL=… SHARE_DEFAULT_IMAGE=…`.
- [ ] `supabase functions deploy send-push share`.
- [ ] Vérifier les tâches pg_cron (`select * from cron.job;`) : `partants-reminders`, `partants-send-push`.
- [ ] Lancer les tests sur une copie : `npm run db:test` (pgTAP + concurrence).
- [ ] Advisors Supabase (sécurité + performance) sans alerte critique.

## Application
- [ ] `.env` de production (clés publiques seulement) dans les secrets EAS.
- [ ] Icône, écran de démarrage, captures App Store / Play (FR-CA d'abord, EN ensuite), description sans ton publicitaire.
- [ ] Build `eas build --profile production` iOS + Android ; tests sur appareil : carte MapLibre, connexion Apple/Google, notifications (permission après 1re inscription), liens universels, ajout au calendrier, VoiceOver/TalkBack, grande taille de texte, mode sombre.
- [ ] `npm run e2e:mobile` (Maestro) sur simulateur iOS et émulateur Android.

## Légal et confiance (Loi 25)
- [ ] **Politique de confidentialité** publiée (FR/EN) : données collectées (prénom, courriel, photo, intérêts, ville, position approximative non conservée), finalités, durée de conservation, sous-traitants (Supabase, Expo, PostHog, Sentry, Mapbox), droits d'accès/rectification/suppression, responsable de la protection des renseignements personnels désigné.
- [ ] **Conditions d'utilisation** + **décharge de responsabilité** (texte de `terms.body`) relues par un juriste québécois ; version dans `platform_settings.terms_version`.
- [ ] Évaluation des facteurs relatifs à la vie privée (EFVP) — transferts hors Québec (Expo push, PostHog, Sentry).
- [ ] Consentement analytics : PostHog sans données personnelles ; prévoir un interrupteur dans Réglages si le juriste l'exige.
- [ ] Procédure de modération : qui lit `public.reports` (back-office P2 ; d'ici là, Supabase Studio), délais de traitement, bannissement (`profiles.is_banned`).
- [ ] Âge minimum 18 ans indiqué dans les fiches App Store / Play (classification 17+ / « Adultes »).
- [ ] Questionnaires de confidentialité App Store (*App Privacy*) et Play (*Data safety*) cohérents avec la politique.

## Lancement à Montréal
- [ ] 15 à 20 organisateurs recrutés (clubs de course, ligues de basket, soirées de jeux), aidés à créer leurs premières sessions et à importer leur groupe (lien `/g/<code>` collé dans leur WhatsApp).
- [ ] ≥ 10 sessions par semaine dans un même quartier (Griffintown, Plateau, Vieux-Montréal) avant d'en ouvrir un autre : suivre `metrics.weekly`.
- [ ] Tableau de bord PostHog en place (voir `docs/ANALYTICS.md`) et revue hebdomadaire des cibles.
