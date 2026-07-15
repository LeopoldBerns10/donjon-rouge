# Modération automatique complète — Style DraftBot
## Bot Donjon Rouge + Dashboard + Site Admin

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Supprimer PROPREMENT tout ce qui a été fait précédemment : automod.js, les ajouts dans messageCreate.js, botLogger.js (catégorie MODERATION), adminController.js (getBannedWords/addBannedWord/deleteBannedWord), admin.js (routes banned-words), Admin.jsx (BannedWordsPanel + onglet Modération côté site). Tables mod_banned_words et mod_warnings à supprimer via migration SQL.
- Repartir de zéro avec une architecture propre et complète
- Ne rien casser dans l'existant (Route de l'Infinie, anniversaires, commandes, etc.)
- Inspecter l'existant avant de coder (structure messageCreate.js, dashboard/src/, frontend/src/pages/Admin.jsx)

---

## Architecture générale

Toute la configuration de modération est stockée en Supabase (table `mod_config`) et lue par le bot au démarrage + mise en cache toutes les 5 minutes. Le dashboard ET le site admin permettent de modifier cette config en temps réel.

---

## Tables Supabase (nouvelles, remplacent les anciennes)

### `mod_config`
Stocke TOUS les paramètres de modération en une seule table clé/valeur JSON :
- `id` (uuid, pk)
- `key` (text, unique) — nom du paramètre
- `value` (jsonb) — valeur du paramètre
- `updated_at` (timestamp)
- `updated_by` (text) — discord_id de l'admin qui a modifié

Paramètres à initialiser (valeurs par défaut) :
```json
{ "key": "automod_enabled", "value": false }
{ "key": "exempt_roles", "value": ["611123759864348672", "1297318759396278425"] }
{ "key": "exempt_members", "value": [] }
{ "key": "ignored_channels", "value": ["1522722935918559364"] }
{ "key": "monitored_channels", "value": "all" }
{ "key": "banned_words_enabled", "value": true }
{ "key": "banned_words_list", "value": ["merde","putain","connard","enculé","salope","con","conne","bâtard","fils de pute","nique","niquer","fdp","tg","va te faire","pd","tapette","attardé","mongol","trisomique","pédé","racist","nazi"] }
{ "key": "spam_enabled", "value": true }
{ "key": "spam_threshold", "value": 5 }
{ "key": "spam_interval_seconds", "value": 10 }
{ "key": "caps_enabled", "value": true }
{ "key": "caps_threshold_percent", "value": 70 }
{ "key": "caps_min_length", "value": 10 }
{ "key": "links_enabled", "value": false }
{ "key": "links_whitelist", "value": [] }
{ "key": "mentions_enabled", "value": true }
{ "key": "mentions_max", "value": 5 }
{ "key": "warn_threshold", "value": 3 }
{ "key": "mute_durations", "value": [10, 60, 1440] }
{ "key": "warn_expiry_hours", "value": 24 }
{ "key": "log_channel", "value": "1522722935918559364" }
{ "key": "warn_dm_enabled", "value": true }
{ "key": "action_message_style", "value": "dm" }
```

### `mod_warnings`
- `id` (uuid, pk)
- `discord_id` (text)
- `discord_name` (text)
- `reason` (text)
- `type` (text) — 'banned_word' | 'spam' | 'caps' | 'links' | 'mentions' | 'manual'
- `warned_at` (timestamptz)
- `expires_at` (timestamptz)
- `auto` (boolean) — true si automatique, false si manuel

---

## Fonctionnalités de détection (bot/src/lib/automod.js)

### 1. Mots interdits (`banned_words_enabled`)
- Détection de mots/expressions interdits dans le message (case-insensitive, avec variantes accentuées)
- Liste pré-remplie FR (voir `banned_words_list` ci-dessus)
- Entièrement éditable depuis le dashboard/site

### 2. Spam (`spam_enabled`)
- Détection si un membre envoie plus de `spam_threshold` messages similaires (similarité > 80%) en `spam_interval_seconds` secondes
- Cache en mémoire par membre, reset après déclenchement

### 3. Abus de majuscules (`caps_enabled`)
- Si un message de plus de `caps_min_length` caractères contient plus de `caps_threshold_percent`% de majuscules
- Ex: "TU ES NUL ET TU JOUES MAL" → détecté

### 4. Liens non autorisés (`links_enabled`)
- Détection d'URLs dans les messages
- `links_whitelist` : liste de domaines autorisés (ex: youtube.com, discord.gg)
- Si activé, tout lien hors whitelist est supprimé

### 5. Mentions excessives (`mentions_enabled`)
- Si un message contient plus de `mentions_max` mentions (@user ou @role)

---

## Logique de sanction (dans automod.js)

### Exemptions
- Membres avec rôle Chef (611123759864348672) → exempt
- Membres avec rôle Adjoint (1297318759396278425) → exempt
- Membres listés dans `exempt_members` (discord_ids) → exempt
- Membres avec rôles dans `exempt_roles` → exempt
- Messages dans canaux listés dans `ignored_channels` → ignorés
- Messages du bot lui-même → ignorés

### Flux de sanction
1. Message détecté comme violation
2. Message supprimé
3. Compter les warnings actifs (non expirés) du membre dans `mod_warnings`
4. Ajouter un nouveau warning avec `expires_at = NOW() + warn_expiry_hours`
5. Selon le total de warnings actifs :
   - 1 warning : DM "⚠️ Avertissement 1/3 — [raison] — [conseil]"
   - 2 warnings : DM "⚠️ Avertissement 2/3 — [raison] — attention mute imminent"
   - 3 warnings : DM "🔇 Tu as été muté [durée] — [raison]" + timeout Discord (`member.timeout()`)
     - 1er mute (total mutes = 1) : `mute_durations[0]` minutes (défaut 10 min)
     - 2ème mute (total mutes = 2) : `mute_durations[1]` minutes (défaut 1h)
     - 3ème mute+ (total mutes >= 3) : `mute_durations[2]` minutes (défaut 24h)
     - Après chaque mute : reset des warnings actifs (DELETE WHERE discord_id = ... AND expires_at > NOW())
6. Log dans salon `log_channel` avec : pseudo, type de violation, contenu original (tronqué à 100 chars), sanction appliquée

---

## Panel de configuration — Dashboard ET Site Admin

Créer une page/section de modération **identique** dans les deux endroits :
- `dashboard/src/pages/Moderation.jsx` (nouveau fichier)
- `frontend/src/pages/Admin.jsx` (nouveau onglet "🛡️ Modération" dans le panel superadmin)

### Sections du panel

#### 1. Activation générale
- Toggle ON/OFF principal de toute la modération automatique

#### 2. Salons
- Sélection des salons ignorés (multi-select des salons Discord récupérés via API)
- Le salon Logs bot est toujours ignoré par défaut et non modifiable

#### 3. Exemptions
- Liste des rôles exempts (Chef et Adjoint par défaut, ajout/suppression possible)
- Liste des membres exempts individuellement (recherche par pseudo, ajout/suppression)

#### 4. Mots interdits
- Toggle ON/OFF
- Liste complète des mots interdits avec suppression individuelle
- Champ d'ajout de mot/expression
- Bouton "Réinitialiser la liste par défaut"

#### 5. Anti-spam
- Toggle ON/OFF
- Seuil de messages (slider ou champ numérique, défaut 5)
- Intervalle de temps en secondes (défaut 10s)

#### 6. Anti-majuscules
- Toggle ON/OFF
- Pourcentage de majuscules (défaut 70%)
- Longueur minimale du message (défaut 10 caractères)

#### 7. Anti-liens
- Toggle ON/OFF
- Liste blanche de domaines autorisés (ajout/suppression)

#### 8. Anti-mentions
- Toggle ON/OFF
- Nombre max de mentions par message (défaut 5)

#### 9. Sanctions
- Nombre d'avertissements avant mute (défaut 3)
- Durées de mute progressives (3 champs modifiables : 1er/2ème/3ème+ mute, en minutes)
- Expiration des avertissements (en heures, défaut 24h)

#### 10. Historique des sanctions
- Tableau des derniers warnings/mutes (depuis mod_warnings)
- Colonnes : membre, type de violation, date, sanction appliquée
- Bouton "Purger les warnings" d'un membre spécifique

---

## Endpoints backend (nouveaux, dans admin.js)

```
GET    /api/admin/automod/config          → récupère toute la config mod_config
PUT    /api/admin/automod/config          → met à jour une ou plusieurs clés
GET    /api/admin/automod/warnings        → historique des warnings (paginé)
DELETE /api/admin/automod/warnings/:id    → supprime un warning
DELETE /api/admin/automod/warnings/member/:discord_id → purge tous les warnings d'un membre
GET    /api/admin/automod/channels        → liste des salons Discord (via bot)
GET    /api/admin/automod/roles           → liste des rôles Discord (via bot)
```

---

## Nouveaux fichiers à créer
- `bot/src/lib/automod.js` — logique de détection + cache config
- `bot/migrations/automod_v2.sql` — DROP ancien + CREATE nouveau
- `dashboard/src/pages/Moderation.jsx` — panel dashboard
- Nouveau endpoint dans `backend/src/routes/admin.js`
- Nouveau onglet dans `frontend/src/pages/Admin.jsx`

## Fichiers à modifier
- `bot/src/events/messageCreate.js` — greffer automod proprement
- `backend/src/controllers/adminController.js` — fonctions automod
- `dashboard/src/App.jsx` ou router — ajouter route /moderation

---

## Migration SQL
Le fichier `bot/migrations/automod_v2.sql` doit :
1. DROP TABLE IF EXISTS mod_banned_words CASCADE
2. DROP TABLE IF EXISTS mod_warnings CASCADE (ancienne structure)
3. CREATE TABLE mod_config (...)
4. CREATE TABLE mod_warnings (...) avec la nouvelle structure
5. INSERT INTO mod_config les valeurs par défaut
6. INSERT INTO mod_config la liste de mots interdits FR pré-remplie

---

## Récap attendu de Claude Code
- Fichiers créés/modifiés listés précisément
- Migration SQL complète à exécuter
- Confirmation suppression propre de l'ancien code
- Confirmation que Route de l'Infinie, anniversaires et autres features ne sont pas impactés
- Où accéder au panel dans le dashboard et dans le site admin
