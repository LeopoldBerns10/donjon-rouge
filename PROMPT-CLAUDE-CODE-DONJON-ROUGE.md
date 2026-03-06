# 🏰 PROMPT CLAUDE CODE — DONJON ROUGE
## Site communautaire complet — Guilde Clash of Clans

---

## CONTEXTE

Tu vas construire le site web complet "Donjon Rouge", une plateforme communautaire pour une guilde Clash of Clans française. Le projet est déjà initialisé sur GitHub avec deux dossiers : `/frontend` et `/backend`. L'hébergement est sur Render (frontend static + backend web service). La base de données est sur Supabase (PostgreSQL, tables déjà créées).

---

## INFORMATIONS DU PROJET

```
Nom de la guilde    : Donjon Rouge
Tag clan CoC        : #29292QPRC
Discord             : https://discord.gg/GQ5a6q6X
Backend Render URL  : https://donjon-rouge-api.onrender.com
Frontend Render URL : https://donjon-rouge.onrender.com
```

---

## STACK TECHNIQUE

```
Frontend  : React + Vite + Tailwind CSS
Backend   : Node.js + Express + Socket.io
BDD       : Supabase (PostgreSQL) — tables déjà créées
API CoC   : https://developer.clashofclans.com (token dans env)
Assets    : https://raw.githubusercontent.com/Statscell/clash-assets/main/
Fonts     : Google Fonts — Cinzel + Cinzel Decorative
```

---

## VARIABLES D'ENVIRONNEMENT

### Backend (.env)
```
NODE_ENV=production
PORT=3000
COC_API_TOKEN=xxxx
COC_CLAN_TAG=#29292QPRC
SUPABASE_URL=xxxx
SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_KEY=xxxx
JWT_SECRET=donjon_rouge_secret_2025
JWT_EXPIRY=7d
FRONTEND_URL=https://donjon-rouge.onrender.com
DISCORD_INVITE=https://discord.gg/GQ5a6q6X
```

### Frontend (.env)
```
VITE_API_URL=https://donjon-rouge-api.onrender.com
VITE_SOCKET_URL=https://donjon-rouge-api.onrender.com
VITE_DISCORD_INVITE=https://discord.gg/GQ5a6q6X
VITE_COC_CLAN_TAG=#29292QPRC
```

---

## SCHÉMA BASE DE DONNÉES (déjà créé sur Supabase)

```sql
players         : id, username, password_hash, coc_tag, role, is_admin, avatar_url, created_at, last_seen
coc_stats_cache : coc_tag (PK), data (JSONB), updated_at
forum_posts     : id, author_id, title, content, is_pinned, is_announcement, category, likes, created_at
forum_replies   : id, post_id, author_id, content, likes, created_at
chat_messages   : id, author_id, channel, content, created_at
announcements   : id, author_id, type, title, content, is_active, created_at
post_likes      : player_id, post_id (PK composite)
```

---

## STRUCTURE DES FICHIERS À CRÉER

```
donjon-rouge/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── assets/
│       │   └── logo.png          ← logo dragon rouge (à placer manuellement)
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Footer.jsx
│       │   ├── StatCard.jsx
│       │   ├── SectionHeader.jsx
│       │   ├── DragonBackground.jsx
│       │   └── RoleTag.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Tracker.jsx
│       │   ├── PlayerProfile.jsx
│       │   ├── Forum.jsx
│       │   ├── Announcements.jsx
│       │   ├── Vitrine.jsx
│       │   └── Admin.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useSocket.js
│       │   └── useCocApi.js
│       └── lib/
│           ├── supabase.js
│           ├── api.js
│           └── constants.js
│
└── backend/
    ├── package.json
    ├── .env.example
    └── src/
        ├── index.js              ← point d'entrée Express + Socket.io
        ├── routes/
        │   ├── auth.js
        │   ├── players.js
        │   ├── coc.js
        │   ├── forum.js
        │   ├── chat.js
        │   └── announcements.js
        ├── controllers/
        │   ├── authController.js
        │   ├── cocController.js
        │   ├── forumController.js
        │   └── announcementController.js
        ├── middleware/
        │   ├── auth.js           ← vérification JWT
        │   ├── adminOnly.js
        │   └── rateLimiter.js
        ├── services/
        │   ├── cocApiService.js  ← appels API Clash of Clans
        │   └── cacheService.js   ← cache Supabase des stats CoC
        └── lib/
            └── supabase.js
```

---

## DESIGN & IDENTITÉ VISUELLE

### Palette de couleurs
```css
--blood:       #6B0000
--crimson:     #C41E3A
--ember:       #FF4500
--gold:        #B8860B
--gold-bright: #D4A017
--gold-light:  #F0C040
--stone:       #0e0e0e
--stone-mid:   #181818
--stone-light: #242424
--fog:         #333333
--ash:         #777777
--bone:        #d4c5a9
```

### Style général
- Thème dark fantasy médiéval
- Fond : canvas animé avec braises qui montent, lueur rouge centrale, craquelures de pierre
- Typographie : Cinzel Decorative (titres) + Cinzel (nav/labels) + Segoe UI (corps)
- Logo : dragon rouge sur bouclier (fichier `/frontend/src/assets/logo.png`)
- Scrollbar custom : fine, rouge bordeaux
- Animations : fadeUp à l'entrée des pages, float sur le logo

---

## MODULE 1 — BACKEND NODE.JS

### `backend/src/index.js`
- Express app avec CORS configuré pour `FRONTEND_URL`
- Socket.io attaché au même serveur HTTP
- Routes montées : `/api/auth`, `/api/players`, `/api/coc`, `/api/forum`, `/api/chat`, `/api/announcements`
- Health check : `GET /health` retourne `{ status: 'ok', clan: '#29292QPRC' }`

### `backend/src/services/cocApiService.js`
Fonctions à implémenter :
```javascript
getClanInfo(clanTag)          // GET /clans/{clanTag}
getClanMembers(clanTag)       // GET /clans/{clanTag}/members
getPlayerInfo(playerTag)      // GET /players/{playerTag}
getClanWarLog(clanTag)        // GET /clans/{clanTag}/warlog
getCurrentWar(clanTag)        // GET /clans/{clanTag}/currentwar
getClanRaidSeasons(clanTag)   // GET /clans/{clanTag}/capitalraidseasons
```

Headers CoC API :
```javascript
Authorization: `Bearer ${process.env.COC_API_TOKEN}`
```

URL de base : `https://api.clashofclans.com/v1`
Encoder les tags avec `encodeURIComponent` (le # devient %23)

### `backend/src/services/cacheService.js`
- Avant chaque appel API CoC, vérifier si les données existent dans `coc_stats_cache`
- Si `updated_at` < 10 minutes → retourner le cache
- Sinon → appeler l'API, sauvegarder en cache, retourner les données fraîches

### Routes backend à créer :

#### `/api/coc`
```
GET /api/coc/clan              → infos + membres du clan #29292QPRC
GET /api/coc/clan/members      → liste membres avec stats
GET /api/coc/clan/war          → guerre en cours
GET /api/coc/clan/warlog       → historique guerres
GET /api/coc/clan/raids        → raid weekend
GET /api/coc/player/:tag       → profil complet d'un joueur
```

#### `/api/auth`
```
POST /api/auth/register        → { username, password, coc_tag }
POST /api/auth/login           → { username, password } → JWT token
GET  /api/auth/me              → profil connecté (auth requise)
```

#### `/api/forum`
```
GET    /api/forum/posts           → liste posts (triés par pinned puis date)
GET    /api/forum/posts/:id       → post + replies
POST   /api/forum/posts           → créer post (auth requise)
POST   /api/forum/posts/:id/reply → répondre (auth requise)
POST   /api/forum/posts/:id/like  → liker (auth requise)
DELETE /api/forum/posts/:id       → supprimer (admin seulement)
```

#### `/api/announcements`
```
GET  /api/announcements        → annonces actives
POST /api/announcements        → créer (admin seulement)
PUT  /api/announcements/:id    → modifier (admin seulement)
```

#### Socket.io events
```javascript
// Côté serveur
'join_channel'    → socket rejoint un salon (ex: 'général')
'send_message'    → reçoit { channel, content } → broadcast à tous dans le salon
'user_connected'  → notifie les autres de la connexion
'user_disconnected'

// Côté client
'new_message'     → { id, author, role, content, time }
'user_joined'
'user_left'
```

---

## MODULE 2 — FRONTEND REACT

### Page `Home.jsx`
- Canvas DragonBackground (braises animées)
- Logo dragon animé (lévitation + glow rouge)
- Titre "DONJON / ROUGE" en Cinzel Decorative
- Compteur animé membres (0 → nombre réel via API CoC)
- 4 StatCards : Membres, Guerres gagnées, Trophées record, Niveau clan
- Zone placeholder dynamique (prochaine guerre / événement)
- 3 boutons CTA : "📊 Tracker Stats" + "💬 Rejoindre le Forum" + "💬 Discord" (lien https://discord.gg/GQ5a6q6X, couleur indigo #5865F2)

### Page `Tracker.jsx`
- Appel à `GET /api/coc/clan/members`
- Tableau de classement : Rang 🥇🥈🥉, Joueur, HDV (badge rouge), Trophées, Dons, Guerres, Win%, Statut en ligne
- Barre de recherche filtrante
- Au clic sur un joueur → ouvre `PlayerProfile.jsx`

### Page `PlayerProfile.jsx`
C'est la page la plus importante — elle reproduit exactement le style de clashspot.net

#### Header du profil :
```
[Avatar HDV]  [Nom joueur]          [Stats rapides en ligne]
[Niveau MDO]  [Tag #XXXX]     ⚔️270  ✖️0  ⭐1775  🏆Guerre
              [Clan: DONJON-ROUGE]  🛡️Dons  📊Trophées construction
              [Rôle: Chef]
```

#### 10 onglets de navigation :
1. **Vue d'ensemble** — stats générales, ligue actuelle, progression village
2. **Ranked** — historique trophées ligue légende
3. **Attaques de guerre** — liste des attaques avec étoiles et %
4. **Ligue Légende** — saison en cours, classement
5. **Guerres de Clans** — participation, étoiles, taux de réussite
6. **Ligues de guerre de clans** — CWL stats
7. **Statistiques de guerre** — graphiques win/loss, étoiles moyennes
8. **Raids** — Capital raid weekend
9. **Classements** — position dans les classements
10. **Troupes** — ONGLET PRINCIPAL (voir détail ci-dessous)
11. **Succès** — achievements du joueur

#### Onglet Troupes (détail) :
Structure identique à clashspot.net :

```
PROGRESSION TOTALE          [████████████░] 93%

■ HÉROS                     [████████████░] 96%
  [Roi Barbare lv105] [Reine Archère lv80] [Grand Gardien lv55] [Prince Minion lv10]

■ ÉQUIPEMENT DE HÉROS       [████████████░] 89%
  [grille d'équipements avec niveau]

■ FAMILIERS                 [████████████░] 94%
  [grille familiers avec niveau]

■ MACHINES DE SIÈGE         [████████████] 100%
  [grille machines avec niveau]

■ TROUPES                   [████████████░] 98%
  [grille troupes avec niveau]

■ TROUPES NOIRES            [████████████░] 97%
  [grille troupes noires avec niveau]

■ SORTS                     [████████████░] 97%
  [grille sorts avec niveau]

■ SUPER TROUPES             [████████████░] XX%
  [grille super troupes avec niveau]
```

#### Icônes troupes (URLs des images) :
```javascript
// Base URL pour les assets
const ASSETS_BASE = 'https://raw.githubusercontent.com/Statscell/clash-assets/main'

// Exemples d'URLs
const TROOP_ICONS = {
  // Troupes principales
  'Barbarian':        `${ASSETS_BASE}/troops/Barbarian.png`,
  'Archer':           `${ASSETS_BASE}/troops/Archer.png`,
  'Giant':            `${ASSETS_BASE}/troops/Giant.png`,
  'Goblin':           `${ASSETS_BASE}/troops/Goblin.png`,
  'Wall Breaker':     `${ASSETS_BASE}/troops/Wall_Breaker.png`,
  'Balloon':          `${ASSETS_BASE}/troops/Balloon.png`,
  'Wizard':           `${ASSETS_BASE}/troops/Wizard.png`,
  'Healer':           `${ASSETS_BASE}/troops/Healer.png`,
  'Dragon':           `${ASSETS_BASE}/troops/Dragon.png`,
  'P.E.K.K.A':        `${ASSETS_BASE}/troops/P.E.K.K.A.png`,
  'Baby Dragon':      `${ASSETS_BASE}/troops/Baby_Dragon.png`,
  'Miner':            `${ASSETS_BASE}/troops/Miner.png`,
  'Electro Dragon':   `${ASSETS_BASE}/troops/Electro_Dragon.png`,
  'Yeti':             `${ASSETS_BASE}/troops/Yeti.png`,
  'Dragon Rider':     `${ASSETS_BASE}/troops/Dragon_Rider.png`,
  'Electro Titan':    `${ASSETS_BASE}/troops/Electro_Titan.png`,
  'Root Rider':       `${ASSETS_BASE}/troops/Root_Rider.png`,
  // Héros
  'Barbarian King':   `${ASSETS_BASE}/heroes/Barbarian_King.png`,
  'Archer Queen':     `${ASSETS_BASE}/heroes/Archer_Queen.png`,
  'Grand Warden':     `${ASSETS_BASE}/heroes/Grand_Warden.png`,
  'Royal Champion':   `${ASSETS_BASE}/heroes/Royal_Champion.png`,
  'Minion Prince':    `${ASSETS_BASE}/heroes/Minion_Prince.png`,
  // Sorts
  'Lightning Spell':  `${ASSETS_BASE}/spells/Lightning_Spell.png`,
  'Healing Spell':    `${ASSETS_BASE}/spells/Healing_Spell.png`,
  'Rage Spell':       `${ASSETS_BASE}/spells/Rage_Spell.png`,
  'Freeze Spell':     `${ASSETS_BASE}/spells/Freeze_Spell.png`,
  // Machines de siège
  'Wall Wrecker':     `${ASSETS_BASE}/siege-machines/Wall_Wrecker.png`,
  'Battle Blimp':     `${ASSETS_BASE}/siege-machines/Battle_Blimp.png`,
  'Stone Slammer':    `${ASSETS_BASE}/siege-machines/Stone_Slammer.png`,
  'Siege Barracks':   `${ASSETS_BASE}/siege-machines/Siege_Barracks.png`,
  'Log Launcher':     `${ASSETS_BASE}/siege-machines/Log_Launcher.png`,
  'Flame Flinger':    `${ASSETS_BASE}/siege-machines/Flame_Flinger.png`,
  'Battle Drill':     `${ASSETS_BASE}/siege-machines/Battle_Drill.png`,
}

// Fallback si image non trouvée : afficher un carré gris avec le nom
```

#### ⚠️ IMPORTANT — Système de ligues :
Ne pas utiliser les anciennes ligues (Bronze, Argent, Or, Cristal, Maître).
**Seuls les ligues actives actuelles sont à afficher :**
- Ligue Légende (icône flocon violet)
- Champion I / II / III
- Titan I / II / III
- Master I / II / III

### Page `Forum.jsx`
Deux onglets :

**Forum :**
- Liste des posts avec : avatar auteur, nom, rôle (Chef/Co-chef/Membre), date, contenu, likes, nb réponses
- Posts épinglés en haut avec badge doré
- Bouton "Nouveau post" (auth requise)
- Au clic sur un post → affiche les réponses

**Tchat Live :**
- Connexion Socket.io au salon "général"
- Liste des messages avec scroll auto vers le bas
- Input + bouton Envoyer (Entrée = envoyer)
- Indicateur "X connectés"
- Couleurs des noms selon le rôle : Chef=or, Co-chef=rouge, Membre=gris

### Page `Announcements.jsx`
- Appel à `GET /api/announcements`
- Cards avec bordure gauche colorée selon le type :
  - URGENT → orange-rouge
  - INFO → or
  - VICTOIRE → vert
  - RECRUTEMENT → bleu

### Page `Vitrine.jsx`
- Section "Patch Notes" : cartes avec tag type + titre + date + bouton "Lire"
- Section "Vidéos Influenceurs" : embed YouTube ou cards avec thumbnail

### Page `Admin.jsx`
Accessible uniquement si `player.is_admin = true`

4 sous-onglets :
1. **Dashboard** : stats (membres actifs, posts ce mois, guerres jouées, signalements)
2. **Membres** : liste avec boutons Promouvoir / Exclure
3. **Annonces** : formulaire créer annonce (type + titre + contenu)
4. **Modération** : liste signalements avec boutons Supprimer / Ignorer

### Composant `Navbar.jsx`
- Logo (img) + "DONJON ROUGE" en Cinzel Decorative
- Liens : Accueil · Tracker · Forum · Annonces · Vitrine · Admin (si admin)
- Avatar utilisateur connecté (initiales) en haut à droite
- Si non connecté : bouton "Connexion"
- Sticky top, blur backdrop, border bottom rouge

### Auth (`hooks/useAuth.js`)
- Stockage JWT dans `localStorage`
- `login(username, password)` → POST `/api/auth/login`
- `logout()` → supprime le token
- `me()` → GET `/api/auth/me`
- Modal de connexion : username + password

---

## MODULE 3 — CONFIGURATION DÉPLOIEMENT

### `frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
})
```

### `frontend/package.json` scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### `backend/package.json` scripts
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

### `backend/package.json` dépendances
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.39.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### `frontend/package.json` dépendances
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "socket.io-client": "^4.7.2",
    "@supabase/supabase-js": "^2.39.0",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.10",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33"
  }
}
```

---

## RÈGLES IMPORTANTES

1. **Pas d'anciennes ligues CoC** — uniquement Ligue Légende, Champion, Titan, Master
2. **Cache API CoC** — toujours vérifier le cache Supabase avant d'appeler l'API (limite de taux)
3. **Tags CoC** — toujours encoder avec `encodeURIComponent()` avant les appels API
4. **Images troupes** — si l'URL GitHub ne charge pas, afficher un fallback gris avec le nom
5. **Socket.io** — utiliser les rooms par channel, pas de broadcast global
6. **JWT** — stocker côté client dans localStorage, envoyer dans le header `Authorization: Bearer xxx`
7. **Admin** — vérifier `is_admin` côté backend ET côté frontend pour chaque action sensible
8. **CORS** — backend configuré pour accepter uniquement `FRONTEND_URL`
9. **Variables d'env** — ne jamais hardcoder les clés, toujours utiliser `process.env` côté backend et `import.meta.env` côté frontend
10. **Déploiement** — le build Render se déclenche automatiquement à chaque `git push` sur `main`

---

## ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

1. Backend : `index.js` + structure Express + Socket.io
2. Backend : `cocApiService.js` + `cacheService.js`
3. Backend : toutes les routes (auth, coc, forum, announcements, chat)
4. Frontend : setup Vite + Tailwind + React Router
5. Frontend : composants partagés (Navbar, Footer, DragonBackground)
6. Frontend : page Home
7. Frontend : page Tracker + PlayerProfile (avec tous les onglets)
8. Frontend : page Forum + tchat Socket.io
9. Frontend : page Announcements + Vitrine
10. Frontend : page Admin
11. Test end-to-end + git push → déploiement auto Render

---

*Projet Donjon Rouge — Clan CoC #29292QPRC — discord.gg/GQ5a6q6X*
