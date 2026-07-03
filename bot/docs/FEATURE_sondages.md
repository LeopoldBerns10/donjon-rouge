# FEATURE — Système de Sondages
## Bot Discord — Donjon Rouge

---

## Contexte

Système de sondages avec boutons de vote, fin automatique et affichage des résultats.

---

## Salon

**ID :** `1520034566532759633`

Tout se passe dans ce salon :
- Le panel avec les boutons de gestion
- Les sondages actifs
- Les résultats finaux

---

## Nouvelle table Supabase — `polls`

```sql
CREATE TABLE IF NOT EXISTS polls (
  id            SERIAL PRIMARY KEY,
  message_id    TEXT NOT NULL UNIQUE,  -- ID du message Discord du sondage
  channel_id    TEXT NOT NULL,
  creator_id    TEXT NOT NULL,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,        -- ["Option 1", "Option 2", ...]
  votes         JSONB NOT NULL DEFAULT '{}', -- {"discord_id": option_index}
  ends_at       TIMESTAMPTZ NOT NULL,
  ended         BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Panel sondage

### Comportement
- Posté dans le salon `1520034566532759633` via commande `/setuppoll` (admin only)
- L'ID du message est stocké dans `bot_config` avec la clé `poll_panel_id`

### Format de l'embed
```
📊 SONDAGES — DONJON ROUGE

Crée un sondage pour recueillir l'avis du clan !
Les membres peuvent voter via les boutons sous le sondage.
```

### Boutons
```
[ 📊 Créer un sondage ]  [ 🏁 Terminer le sondage ]
```

| Bouton | custom_id | Accès |
|--------|-----------|-------|
| 📊 Créer un sondage | `poll_create` | Rôle LIE |
| 🏁 Terminer le sondage | `poll_end` | Rôle Chef uniquement |

---

## Flux Créer un sondage

1. Clic sur 📊 Créer un sondage
2. Bot ouvre un **modal** avec :
   - Champ 1 : "Question" (texte court, obligatoire)
   - Champ 2 : "Options (une par ligne, 2 à 20)" (texte long, obligatoire)
   - Champ 3 : "Durée (ex: 24h, 48h, 72h)" (texte court, obligatoire)

3. Après soumission :
   - Valider le format durée (nombre suivi de 'h')
   - Valider 2 à 20 options
   - Calculer `ends_at = maintenant + durée`
   - Poster le sondage dans le salon avec les boutons de vote
   - Stocker dans `polls`

### Format du sondage posté
```
📊 SONDAGE — Question posée ici ?

Option 1 — 0 vote (0%)
Option 2 — 0 vote (0%)
Option 3 — 0 vote (0%)

👥 0 participant(s) • ⏰ Se termine dans 24h
Créé par @membre
```

### Boutons de vote (un par option)
```
[ Option 1 ]  [ Option 2 ]  [ Option 3 ]  ...
```
- `custom_id` : `poll_vote:POLL_ID:OPTION_INDEX`
- Max 5 boutons par ActionRow → plusieurs rows si > 5 options
- Un membre ne peut voter qu'une seule fois (changement de vote autorisé)

---

## Flux Vote

1. Clic sur un bouton option
2. Vérifier rôle LIE
3. Vérifier que le sondage est encore actif (`ended = false` et `ends_at > maintenant`)
4. Enregistrer/mettre à jour le vote dans `polls.votes`
5. Mettre à jour l'embed avec les nouveaux comptages
6. Réponse éphémère : "✅ Vote enregistré pour **Option X** !"
   - Si changement de vote : "✅ Vote modifié pour **Option X** !"

---

## Flux Terminer le sondage (admin)

1. Clic sur 🏁 Terminer le sondage
2. Vérifier rôle Chef
3. Si aucun sondage actif → éphémère : "Aucun sondage en cours."
4. Si sondage actif → terminer immédiatement (appeler `endPoll`)

---

## Fin automatique du sondage

### Déclencheur
Dans `scheduler.js`, à chaque tick vérifier les sondages dont `ends_at <= maintenant` et `ended = false`.

```js
await checkExpiredPolls(client)
```

### Fonction `endPoll(poll, client)`

1. Marquer `ended = true` dans `polls`
2. Calculer les résultats :
   - Compter les votes par option
   - Calculer les pourcentages
   - Identifier le(s) gagnant(s)
3. Éditer le message du sondage pour afficher les résultats finaux
4. Poster un message de résultats dans le salon

### Format résultats finaux (embed édité)
```
📊 SONDAGE TERMINÉ — Question posée ici ?

🏆 Option 2 — 12 votes (48%)
   Option 1 — 8 votes (32%)
   Option 3 — 5 votes (20%)

👥 25 participant(s) • ✅ Terminé
```

### Message résultats (nouveau message)
```
🏁 Le sondage est terminé !

🏆 Résultat : **Option 2** remporte le sondage avec 12 votes (48%) !
```

---

## Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `src/lib/pollManager.js` | Logique sondages (création, vote, fin, résultats) |
| `src/setup/sendPollPanel.js` | Envoi du panel dans le salon |
| `migrations/polls.sql` | Migration SQL |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/scheduler.js` | Ajouter `checkExpiredPolls(client)` à chaque tick |
| `src/events/interactionCreate.js` | Router `poll_create`, `poll_end`, `poll_vote:*` + modals |
| `index.js` | Ajouter commandes `/setuppoll` |

---

## Notes

- Un seul sondage actif à la fois dans le salon
- Si un membre vote alors que le sondage vient de se terminer → message éphémère "Le sondage est terminé."
- Le rôle LIE requis pour créer et voter
- Les résultats sont définitifs une fois le sondage terminé
- Conserver les sondages terminés dans la table pour historique
