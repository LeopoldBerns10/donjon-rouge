# FEATURE — Salon Anniversaires
## Bot Discord — Donjon Rouge

---

## Contexte

Système d'inscription et de souhaits automatiques d'anniversaires pour les membres du serveur.

---

## Salon

**ID :** `1520034360559013939`

Tout se passe dans ce salon :
- Le panel avec les boutons
- Les confirmations d'inscription
- Les souhaits automatiques à 10h

---

## Nouvelle table Supabase — `birthdays`

```sql
CREATE TABLE IF NOT EXISTS birthdays (
  id            SERIAL PRIMARY KEY,
  discord_id    TEXT NOT NULL UNIQUE,
  discord_name  TEXT NOT NULL,
  birth_day     INTEGER NOT NULL,  -- jour (1-31)
  birth_month   INTEGER NOT NULL,  -- mois (1-12)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Panel anniversaire

### Comportement
- Posté dans le salon `1520034360559013939` via commande `/setupanniversaire` (admin only)
- L'ID du message est stocké dans `bot_config` avec la clé `birthday_panel_id`

### Format de l'embed
```
🎂 ANNIVERSAIRES — DONJON ROUGE

Inscris ta date d'anniversaire pour être fêté par le clan !
Le bot te souhaitera ton anniversaire le jour J à 10h.

Clique sur un bouton ci-dessous :
```

### Boutons
```
[ 🎂 S'inscrire ]  [ ❌ Se désinscrire ]  [ 👥 Voir les inscrits ]
```

| Bouton | custom_id | Accès |
|--------|-----------|-------|
| 🎂 S'inscrire | `birthday_register` | Rôle LIE |
| ❌ Se désinscrire | `birthday_unregister` | Rôle LIE |
| 👥 Voir les inscrits | `birthday_list` | Rôle Chef uniquement |

---

## Flux S'inscrire

1. Clic sur 🎂 S'inscrire
2. Bot ouvre un **modal** avec un champ texte :
   - Label : "Ta date d'anniversaire (JJ/MM)"
   - Placeholder : "ex: 15/06"
   - Validation : format JJ/MM, jour 1-31, mois 1-12
3. Après soumission :
   - Bot vérifie le format
   - Si valide → upsert dans `birthdays`
   - Bot répond en éphémère dans le salon : "✅ Inscription validée ! Le clan te souhaitera ton anniversaire le JJ/MM 🎂"
   - Si invalide → message éphémère d'erreur

---

## Flux Se désinscrire

1. Clic sur ❌ Se désinscrire
2. Bot vérifie si le membre est inscrit
   - Si oui → supprime de `birthdays`, répond éphémère : "✅ Inscription supprimée."
   - Si non → répond éphémère : "Tu n'es pas inscrit."

---

## Flux Voir les inscrits (admin only)

1. Clic sur 👥 Voir les inscrits
2. Vérifier rôle Chef (`611123759864348672`)
3. Bot répond en éphémère avec la liste triée par date (JJ/MM) :
```
📋 Membres inscrits (12) :

01/01 — Membre1
14/02 — Membre2
...
```

---

## Souhaits automatiques — 10h heure Paris

### Déclencheur
Dans `scheduler.js`, à chaque tick vérifier si l'heure Paris = 10h.
Si oui, chercher les membres dont `birth_day` et `birth_month` correspondent à aujourd'hui.

```js
const parisNow = new Date(Date.now() + 2 * 3600000)
const day   = parisNow.getUTCDate()
const month = parisNow.getUTCMonth() + 1
const hour  = parisNow.getUTCHours()

if (hour === 10) {
  await checkBirthdays(client)
}
```

### Format du souhait
```
🎂 @membre Joyeux anniversaire !

Le Donjon Rouge te souhaite une excellente journée ! 🐉🎉
```

### Anti-doublon
Stocker dans `bot_config` la clé `birthday_sent_YYYY-MM-DD` pour éviter d'envoyer plusieurs fois si le scheduler tourne plusieurs fois à 10h.

---

## Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `src/lib/birthdayManager.js` | Logique anniversaires (check, souhait, handlers boutons) |
| `src/setup/sendBirthdayPanel.js` | Envoi du panel dans le salon |
| `migrations/birthdays.sql` | Migration SQL |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/scheduler.js` | Ajouter `checkBirthdays(client)` à 10h |
| `src/events/interactionCreate.js` | Router `birthday_register`, `birthday_unregister`, `birthday_list` + modal `modal_birthday_register` |
| `index.js` | Ajouter commande `/setupanniversaire` |

---

## Notes

- Le rôle LIE requis : vérifier `interaction.member.roles.cache.has(LIE_ROLE_ID)`
- LIE_ROLE_ID à récupérer depuis la config existante
- Si un membre n'est plus dans le serveur le jour de son anniversaire → ignorer silencieusement
- Le scheduler tourne toutes les 30 min → vérifier avec une clé anti-doublon pour ne souhaiter qu'une fois
