# FEATURE — Jeux de Clan (JDC) Tracker
## Bot Discord — Donjon Rouge

---

## Contexte

Les Jeux de Clan (Clan Games) sont un événement mensuel CoC (~22 au 28 de chaque mois, 6 jours).
Chaque membre peut accumuler jusqu'à **10 000 pts** individuellement.
Le règlement DR impose un **minimum de 5 000 pts** pour être considéré actif.
Le palier bonus (toutes récompenses débloquées) est à **4 000 pts individuels**.

L'événement concerne les **deux clans** : DR1 (`#29292QPRC`) et DR2 (`#2RCGG9YR9`).

---

## Paliers du clan (fixes chaque mois)

| Palier | Points clan requis |
|--------|--------------------|
| Tier I | 3 000 |
| Tier II | 7 500 |
| Tier III | 12 000 |
| Tier IV | 18 000 |
| Tier V | 30 000 |
| Tier VI (max) | 50 000 |

---

## Source de données — Polling API

**Méthode :** Polling toutes les **30 minutes** via le backend proxy (`BACKEND_URL`).

**Appels nécessaires :**
1. `GET /clans/{clanTag}/members` → liste des membres actifs du clan
2. Pour chaque membre : `GET /players/{playerTag}` → champ `clanGamePoints` (disponible pendant l'événement actif)

**Détection de l'événement actif :**
- Vérifier que `clanGamePoints` est présent et > 0 sur au moins un membre
- OU stocker manuellement en `bot_config` les dates de début/fin (`jdc_start`, `jdc_end`) au format ISO

**Fin d'événement :**
- Quand `clanGamePoints` disparaît du profil joueur (après le 28) → l'événement est terminé
- Le bot archive alors le résultat final et ferme l'embed live

---

## Nouveaux fichiers à créer

```
src/
  lib/
    jdcTracker.js        — logique principale JDC (fetch, calcul paliers, build embed)
  config/
    jdcConfig.js         — constantes JDC (paliers, seuils, IDs de salons)
```

---

## Nouvelles entrées `bot_config` (Supabase)

| Clé | Valeur |
|-----|--------|
| `jdc_embed_dr1_id` | ID du message embed live DR1 |
| `jdc_embed_dr2_id` | ID du message embed live DR2 |
| `jdc_active` | `"true"` / `"false"` |
| `jdc_start` | date ISO début (ex: `"2026-06-22T08:00:00Z"`) |
| `jdc_end` | date ISO fin (ex: `"2026-06-28T08:00:00Z"`) |

---

## Salons Discord

| Usage | Channel ID |
|-------|------------|
| Embed live JDC (tracking) | `1511988581135159376` |
| Rappels / mentions retardataires | `1510972919407317142` |
| Archivage résultats finaux | `1516046143887376505` |
| Centre de messagerie (panel admin) | `1512087471373029508` |

---

## Fonctionnalité 1 — Embed live (salon `1511988581135159376`)

### Comportement
- **Un embed par clan** (DR1 et DR2), posté au début de l'événement, mis à jour toutes les 30 min
- L'embed est **édité** (pas reposté) — l'ID du message est stocké dans `bot_config`

### Contenu de l'embed

```
🎮 JEUX DE CLAN — DONJON ROUGE (#29292QPRC)
📅 Du 22/06 au 28/06 • Mise à jour : il y a 4 min

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESSION DU CLAN
Points : 47 800 / 50 000 pts
Palier actuel : ✅ Tier V (30 000) → 🔄 Tier VI (50 000)
[████████████████████░░] 95.6%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSEMENT MEMBRES             PTS    STATUT
 1. CyberAlf                  4000   ✅ Bonus
 2. Jérémie                   4000   ✅ Bonus
 3. KD2L                      3750   ⚠️ En cours
 4. TarKhon                   3000   ⚠️ En cours
...
25. Barbar                       0   ❌ Absent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total : 47 800 pts • Moyenne : 1 912 pts
Membres ≥ 5 000 pts (règlement DR) : 12/39
Membres ≥ 4 000 pts (bonus) : 15/39
```

### Barre de progression visuelle
- Utiliser des blocs Unicode : `█` (rempli) et `░` (vide), longueur 20 caractères
- Calculer le % par rapport au palier suivant (pas le max)

### Statut membre
| Points | Emoji | Texte |
|--------|-------|-------|
| ≥ 5000 | ✅ | Règlement atteint |
| ≥ 4000 | 🏆 | Bonus atteint |
| > 0 < 4000 | ⚠️ | En cours |
| 0 | ❌ | Absent |

---

## Fonctionnalité 2 — Rappels automatiques (salon `1510972919407317142`)

### Même logique que les rappels de guerre existants

**Heures d'envoi :** **20h** chaque jour pendant l'événement (jours 2 à 5)

**Conditions de mention :**
- Membres avec 0 pts → mention urgente
- Membres entre 1 et 3 999 pts (pas encore bonus) → mention douce

**Format du message :**
```
⚔️ @membre1 @membre2 — Jeux de Clan en cours !
Vous n'avez pas encore participé. Il reste X jours !
Objectif DR : 5 000 pts minimum 🎯
```

**Auto-suppression :** 2h après envoi (comme les rappels guerre)

**Ne pas envoyer si :** l'événement est terminé (`jdc_active = false`)

---

## Fonctionnalité 3 — Archivage résultats (salon `1516046143887376505`)

### Déclencheur
Quand le bot détecte la **fin des JDC** (date > `jdc_end` ou `clanGamePoints` disparu)

### Comportement
- Poste **un message final par clan** (DR1 + DR2) dans ce salon
- Ce message **n'est jamais édité** — c'est un historique permanent
- Stocker aussi le résultat en Supabase (nouvelle table `jdc_results`)

### Nouvelle table Supabase : `jdc_results`

```sql
CREATE TABLE jdc_results (
  id SERIAL PRIMARY KEY,
  clan_tag TEXT NOT NULL,
  clan_name TEXT NOT NULL,
  season TEXT NOT NULL,           -- ex: "2026-06"
  total_points INTEGER NOT NULL,
  tier_reached INTEGER NOT NULL,  -- 1 à 6
  members JSONB NOT NULL,         -- [{tag, name, points}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Format du message d'archive
```
🏁 RÉSULTATS JEUX DE CLAN — Juin 2026
Clan : DONJON ROUGE (#29292QPRC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Palier atteint : Tier VI (50 000 pts)
📊 Total clan : 52 400 pts
👥 Membres participants : 28/39
✅ Membres ≥ 5 000 pts (règlement) : 15/39

CLASSEMENT FINAL
 1. CyberAlf         5000 pts ✅
 2. Jérémie          5000 pts ✅
 3. KD2L             4800 pts 🏆
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Du 22/06/2026 au 28/06/2026
```

---

## Fonctionnalité 4 — Bouton DM rappel JDC dans le centre de messagerie (salon `1512087471373029508`)

### Contexte
Le centre de messagerie (panel admin) existe déjà dans le bot (`src/lib/messagingHandlers.js`).
Il est accessible uniquement aux membres ayant le rôle **Chef** (`611123759864348672`).
Il faut ajouter un **nouveau bouton** dans ce panel pour envoyer des DMs de rappel JDC.

### Modification du panel de messagerie existant
Ajouter un bouton dans le message du panel (`src/setup/` ou là où le panel est construit) :

```
[ 📨 Rappel Guerre DR1 ]  [ 📨 Rappel Guerre DR2 ]
[ 🏕️ Rappel Raid        ]  [ 🎮 Rappel JDC        ]  ← NOUVEAU
[ ✉️ Message custom     ]  [ 🌍 Message global     ]
```

**Button custom_id :** `messaging_jdc_reminder`

### Comportement au clic

1. Le bot vérifie que `jdc_active = true` dans `bot_config`
   - Si `false` → réponse éphémère : *"Aucun Jeux de Clan en cours actuellement."*

2. Le bot récupère la liste des membres **des deux clans** (DR1 + DR2) dont les points JDC sont < 5 000

3. Le bot affiche un **modal ou message de confirmation** éphémère :
   ```
   🎮 Rappel Jeux de Clan
   Membres à contacter : 24 (DR1 : 18 • DR2 : 6)
   → Membres à 0 pts : 12
   → Membres entre 1 et 4 999 pts : 12
   
   [Confirmer l'envoi]  [Annuler]
   ```

4. Après confirmation → envoie un DM à chaque membre concerné **lié** (présent dans `discord_links`) :

**DM pour membres à 0 pts :**
```
🎮 Jeux de Clan — Donjon Rouge
Hey ! Les Jeux de Clan sont en cours et tu n'as pas encore participé.
Il reste X jours — chaque point compte pour le clan ! 💪
Objectif minimum DR : 5 000 pts 🎯
```

**DM pour membres en cours (1–4 999 pts) :**
```
🎮 Jeux de Clan — Donjon Rouge
Tu es en bonne voie avec X pts, mais l'objectif DR est de 5 000 pts !
Il reste X jours, tu peux y arriver 🔥
```

5. Après envoi → résumé éphémère avec accusés de réception (même logique que les autres rappels existants) :
   ```
   ✅ DMs envoyés : 18/24
   ❌ Échecs (DMs fermés) : 6
   ```

### Fichiers à modifier
- `src/lib/messagingHandlers.js` → ajouter le handler `messaging_jdc_reminder`
- `src/setup/` (fichier du panel messaging) → ajouter le bouton dans le ActionRow
- `src/events/interactionCreate.js` → s'assurer que le nouveau custom_id est routé

---

## Intégration dans `scheduler.js`

Le scheduler tourne toutes les heures. Ajouter dans la boucle :

```js
// JDC — toutes les 30 min (tick pair seulement)
if (isJdcActive()) {
  await updateJdcEmbeds();      // met à jour les embeds DR1 + DR2
  await checkJdcReminders();    // envoie rappels si heure cible (20h)
  await checkJdcEnd();          // archive si événement terminé
}
```

### Nouvelle fonction dans `cocApi.js`
```js
// Récupère les points JDC d'un joueur via le backend proxy
async function getPlayerClanGamePoints(playerTag) {
  const data = await fetchFromBackend(`/players/${encodeURIComponent(playerTag)}`);
  return data?.clanGamePoints ?? 0;
}
```

---

## Intégration dans `jdcConfig.js`

```js
module.exports = {
  TIERS: [
    { tier: 1, points: 3000,  label: 'Tier I'   },
    { tier: 2, points: 7500,  label: 'Tier II'  },
    { tier: 3, points: 12000, label: 'Tier III' },
    { tier: 4, points: 18000, label: 'Tier IV'  },
    { tier: 5, points: 30000, label: 'Tier V'   },
    { tier: 6, points: 50000, label: 'Tier VI'  },
  ],
  INDIVIDUAL_BONUS_THRESHOLD: 4000,   // palier officiel bonus
  INDIVIDUAL_DR_THRESHOLD: 5000,      // règlement DR
  INDIVIDUAL_MAX: 10000,
  JDC_TRACKING_CHANNEL:  '1511988581135159376',
  JDC_REMINDER_CHANNEL:  '1510972919407317142',
  JDC_ARCHIVE_CHANNEL:   '1516046143887376505',
  JDC_MESSAGING_CHANNEL: '1512087471373029508',
  REMINDER_HOUR: 20,   // heure locale (Paris)
  CLANS: [
    { tag: '#29292QPRC', name: 'Donjon Rouge'   },
    { tag: '#2RCGG9YR9', name: 'Donjon Rouge 2' },
  ],
};
```

---

## Notes importantes pour l'implémentation

1. **Le champ `clanGamePoints` n'existe que pendant l'événement actif.** En dehors, il est absent du payload joueur → gérer le cas `undefined` avec valeur par défaut `0`.

2. **Optimisation des appels API :** Appeler `/players/{tag}` pour chaque membre peut représenter ~40 appels par clan par cycle. Le backend proxy doit supporter ce volume. Penser à séquencer avec un délai (`await sleep(100)` entre chaque appel) pour éviter le rate-limit.

3. **Détection automatique du début des JDC :** Lors de chaque tick horaire, si `jdc_active = false`, vérifier si `clanGamePoints > 0` sur quelques membres du clan → si oui, activer automatiquement le tracking et créer l'embed.

4. **Gestion du message embed :** Si l'ID stocké dans `bot_config` est invalide (message supprimé), recréer un nouveau message et mettre à jour `bot_config`.

5. **Les récompenses changent chaque mois** (Tier VI varie) → ne pas hardcoder les noms des récompenses, seulement les seuils de points (qui sont fixes).

6. **DMs JDC via le panel :** Utiliser la même infrastructure d'envoi DM que les rappels guerre/raid existants dans `messagingHandlers.js`. Seuls les membres présents dans `discord_links` reçoivent un DM (les membres non liés sont ignorés silencieusement).
