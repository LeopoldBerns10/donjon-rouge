# Lot 1 — Fondation "Participation Membres"

## Objectif

Créer une base de données unique et réutilisable pour tracker la participation des membres aux guerres (GDC + JDC), qui servira de fondation à deux features futures :
- Classement des membres les plus actifs (bot Discord)
- Système de performance par membre (site web)

Ne PAS implémenter ces deux features maintenant — seulement la fondation.

## Étape 0 — Inspection obligatoire avant toute modification

Avant d'écrire une seule ligne de code, lire et analyser :
- `src/lib/jdcTracker.js`
- `src/lib/exploits.js`
- `src/migrations/jdc_results.sql`
- `src/migrations/discord_events.sql`
- Toute autre table Supabase existante qui contiendrait déjà des données de participation (vérifier notamment si `jdc_results` contient déjà des infos exploitables par membre)

Si des données de participation existent déjà quelque part (ex: dans `jdc_results`), **ne pas dupliquer** — proposer d'étendre l'existant plutôt que créer une table redondante, et expliquer ce choix dans le récap avant de continuer.

## Étape 1 — Schéma de données proposé (à adapter si l'existant le permet)

Table `member_participation` (si rien d'exploitable n'existe déjà) :

| Colonne | Type | Description |
|---|---|---|
| id | uuid, PK | identifiant unique |
| discord_id | text | ID Discord du membre |
| coc_name | text | pseudo CoC au moment de l'événement |
| event_type | text | 'gdc' ou 'jdc' |
| event_date | date | date de la guerre/JDC |
| participated | boolean | a attaqué ou non |
| attack_percentage | integer, nullable | % de la meilleure attaque (GDC uniquement, null si non applicable) |
| double_perf | boolean, default false | true si double perf (GDC uniquement) |
| created_at | timestamptz, default now() |

Index recommandé : sur `(discord_id, event_type, event_date)` pour accélérer les calculs de taux.

## Étape 2 — Fonction de calcul de taux de participation

Créer dans `src/lib/` un fichier `participationStats.js` avec une fonction :

```js
async function getParticipationRate(discordId, options = {})
```

- `options.eventType` : 'gdc' | 'jdc' | 'all' (défaut 'all')
- `options.windowSize` : nombre de dernières guerres à considérer (défaut null = historique complet)
- Retourne : `{ totalEvents, participated, rate, avgAttackPercentage }`

Cette fonction doit être conçue pour être appelée à la fois par le futur classement bot et le futur système de performance site — donc générique, sans logique spécifique à l'un ou l'autre usage.

## Étape 3 — Alimentation de la table

Identifier où, dans le code existant, les résultats de GDC et JDC sont déjà calculés (probablement dans `jdcTracker.js` et/ou le scheduler), et ajouter l'écriture dans `member_participation` à ce moment-là — sans dupliquer la logique de calcul déjà existante, juste logger le résultat.

## Contraintes

- Ne rien casser dans `jdcTracker.js` ou `exploits.js` existants
- Ne pas implémenter le classement ni le système de performance — uniquement la fondation données + fonction de calcul
- Grouper toutes les modifications dans un minimum de fichiers/commits
- Terminer par un récap complet : fichiers créés/modifiés, schéma final retenu (et pourquoi si différent de la proposition ci-dessus), migration SQL exécutée ou à exécuter manuellement, tests effectués
