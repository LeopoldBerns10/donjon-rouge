# Modération automatique Discord
## Bot Donjon Rouge + Dashboard

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter l'existant avant de créer quoi que ce soit (events existants, tables Supabase, dashboard)
- Ne rien casser dans les listeners messageCreate, messageDelete, messageUpdate déjà en place
- Procéder en 2 PHASES : investigation (Phase 1) puis implémentation (Phase 2)

---

## PHASE 1 — INVESTIGATION UNIQUEMENT

Avant de coder, vérifie :
1. Si un rôle "Muted" ou équivalent existe déjà sur le serveur Discord (ID à récupérer), sinon il faudra le créer et configurer ses permissions (pas d'accès en écriture dans aucun salon)
2. Si des tables de modération existent déjà en Supabase (warnings, banned_words, etc.)
3. Comment messageCreate.js est structuré actuellement — la modération devra s'y greffer proprement sans casser Route de l'Infinie, anniversaires, etc.
4. Quels rôles sont exempts : Chef (611123759864348672), Adjoint (1297318759396278425), Lié (1511096527664320655) — non, seulement Chef et Adjoint sont exempts, pas Lié
5. Le salon Logs bot (1522722935918559364) est exclu de la modération

Présente le rapport et ARRÊTE-TOI — attendre validation avant Phase 2.

---

## PHASE 2 — IMPLÉMENTATION

### Tables Supabase à créer
- `mod_banned_words` : id, word (text, unique), added_by (discord_id), created_at
- `mod_warnings` : id, discord_id, reason (text), warned_at (timestamp), expires_at (timestamp, +24h)

### Détections (dans messageCreate)
1. **Mots interdits** : liste configurable depuis le dashboard, stockée dans `mod_banned_words`
2. **Spam** : plus de 5 messages identiques ou quasi-identiques dans les 10 dernières secondes par le même membre
3. **Comportements inappropriés** : insultes, provocations — liste de patterns/mots à définir (peut commencer par une liste basique + enrichie via dashboard)

### Exemptions
- Rôle Chef (611123759864348672) → totalement exempt
- Rôle Adjoint (1297318759396278425) → totalement exempt
- Salon Logs bot (1522722935918559364) → exclu de la modération

### Salons concernés
Tous les salons du serveur SAUF le salon Logs bot (1522722935918559364)

### Sanctions progressives
- **1er avertissement** : message supprimé + DM au membre "⚠️ Avertissement 1/3 — [raison]"
- **2ème avertissement** : message supprimé + DM au membre "⚠️ Avertissement 2/3 — [raison]"
- **3ème avertissement** : message supprimé + DM au membre + mute 10 minutes
- **4ème infraction** (si récidive après 1er mute, compteur reset à 0 après mute) : mute 1 heure
- **5ème infraction** : mute 24 heures
- Chaque sanction est loguée dans le salon Logs bot avec pseudo, raison, et durée du mute si applicable
- Les avertissements (warnings actifs) se réinitialisent automatiquement après 24h sans nouvelle infraction (expires_at = warned_at + 24h)

### Mute technique
- Utiliser `member.timeout()` de Discord.js v14 (timeout natif Discord, pas besoin de rôle "Muted" séparé) pour 10min, 1h ou 24h selon le palier
- Si le timeout échoue (permissions insuffisantes), logger l'erreur dans Logs bot

### Dashboard — gestion des mots interdits
- Nouvelle section dans le dashboard (page dédiée ou onglet dans une page existante) visible par les superadmins uniquement
- Liste des mots interdits actuels, bouton "Ajouter un mot", bouton "Supprimer" par mot
- Appels API vers de nouveaux endpoints backend : GET/POST/DELETE /api/admin/banned-words

### Commandes Discord admin (optionnel, en plus du dashboard)
- `/warn @membre raison` — avertissement manuel par un admin
- `/unwarn @membre` — supprime les avertissements actifs d'un membre
- `/mute @membre durée` — mute manuel

---

## Récap attendu de Claude Code (fin Phase 1)
- Rôle "Muted" existant ou à créer, permissions à configurer
- Tables existantes ou à créer
- Structure de messageCreate.js et comment y greffer la modération proprement
- Confirmation des IDs de rôles exempts

## Récap attendu (fin Phase 2)
- Fichiers créés/modifiés
- Migration SQL à exécuter
- Confirmation que les features existantes (Route de l'Infinie, anniversaires, etc.) ne sont pas impactées
- Où configurer les mots interdits depuis le dashboard
