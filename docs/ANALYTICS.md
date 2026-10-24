# Métriques et tableau de bord

Deux sources, chacune pour ce qu'elle mesure le mieux :

- **PostHog** (événements client, sans donnée sensible : pas de nom, courriel, position ni contenu de message). Liste typée dans `src/lib/analytics.ts`.
- **Base de données** (vérité terrain : remplissage et présence réels). Vues SQL `metrics.weekly` et `metrics.cohorts` (migration 011), lisibles seulement avec la clé service.

## Événements PostHog

| Événement | Quand | Propriétés |
|---|---|---|
| `app_opened` | lancement | — |
| `onboarding_completed` | fin ou « Passer » | `skipped`, `interests` |
| `city_selected` | choix de ville | `city_id` |
| `signup_method` / `signup_completed` | connexion / profil complété (18+, conditions) | `method` |
| `feed_loaded` | 1re page du feed | `duration_ms`, `count` |
| `session_viewed` | ouverture d'un détail | `category`, `price_cents`, `spots_left` |
| `session_joined` / `session_waitlisted` / `session_left` | inscription | `category`, `price_cents` |
| `session_created` | publication | `category`, `price_cents`, `recurrence`, `max_players`, `duplicated` |
| `session_shared` | partage | `category` |
| `session_cancelled` | annulation par l'organisateur | `category` |
| `attendance_recorded` | appel fait | `attended` |
| `review_submitted` | avis envoyés | `count` |
| `group_joined` / `group_created` | groupes | `visibility` |
| `message_sent` | chat | `thread` (session / group) |

## Tableau de bord « Partants — MVP » (PostHog)

| Tuile | Type | Définition | Cible |
|---|---|---|---|
| Activation 48 h | Funnel | `signup_completed` → (`session_joined` **ou** `session_created`) dans les 48 h | ≥ 35 % |
| Rétention 2e session | Retention | `session_joined` → `session_joined` dans les 14 jours | ≥ 40 % |
| Offre hebdomadaire | Trends | `session_created` par semaine, et organisateurs uniques (`unique users`) | 10 sessions / quartier / sem. avant d'ouvrir un secteur |
| Temps de chargement du feed | Trends | p50 / p90 de `feed_loaded.duration_ms` | p90 < 2 000 ms |
| Conversion détail → inscription | Funnel | `session_viewed` → `session_joined` | suivi |
| Partages | Trends | `session_shared` par semaine | suivi |
| Taux de crash | Sentry | sessions sans crash | > 99 % |

Les deux métriques qui exigent la base :

```sql
-- Taux de remplissage (cible ≥ 60 %) et de présence réelle (cible ≥ 80 %), par semaine et par ville
select * from metrics.weekly;
-- Activation 48 h et 2e session en 14 jours, par cohorte d'inscription
select * from metrics.cohorts;
```

Pour les afficher dans PostHog : *Data warehouse → Postgres source* (utilisateur en lecture seule sur le schéma `metrics`), puis une tuile SQL par vue.

## Drapeaux de fonctionnalités

`src/lib/flags.ts` (PostHog en priorité, défaut local sinon) : `payments`, `p2_features`, `map_view`, `new_cities`. Côté serveur : `platform_settings` (`payments_enabled`, `commission_bps`, `p2_features_enabled`).
