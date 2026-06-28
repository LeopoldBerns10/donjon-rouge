# Dashboard Web — Donjon Rouge Bot
## Projet séparé : donjon-rouge-dashboard

---

## Stack technique

- **Framework :** React 18 + Vite
- **Style :** Tailwind CSS
- **Routing :** React Router v6
- **Auth :** Discord OAuth2
- **HTTP :** Axios
- **Icônes :** Lucide React
- **Hébergement :** Render (service static)

---

## Structure du projet

```
dashboard/
  src/
    components/
      Layout.jsx        — sidebar + header
      Sidebar.jsx       — navigation gauche
      Header.jsx        — barre du haut avec avatar Discord
      Card.jsx          — composant carte réutilisable
      Toggle.jsx        — switch on/off
      SaveBar.jsx       — barre "Sauvegarder / Réinitialiser"
    pages/
      Login.jsx         — page de connexion Discord
      Home.jsx          — accueil avec stats
      Welcome.jsx       — messages arrivée/départ
      Messages.jsx      — messages GDC dimanche/mardi
      Birthdays.jsx     — gestion anniversaires
      Polls.jsx         — sondages
      RouteInfinie.jsx  — route de l'infinie
      Members.jsx       — liste membres + liens CoC
    context/
      AuthContext.jsx   — état de connexion Discord
    api/
      index.js          — appels vers le backend proxy
  index.html
  vite.config.js
  tailwind.config.js
  package.json
```

---

## Variables d'environnement

```env
VITE_DISCORD_CLIENT_ID=TON_CLIENT_ID
VITE_DISCORD_REDIRECT_URI=https://donjon-rouge-dashboard.onrender.com/auth/callback
VITE_BACKEND_URL=URL_DU_BACKEND_API_EXISTANT
VITE_GUILD_ID=610767309031866371
VITE_CYBERALF_ID=610765755553939456
```

Côté backend (ajouter dans le backend existant) :
```env
DISCORD_CLIENT_SECRET=TON_CLIENT_SECRET
DISCORD_CLIENT_ID=TON_CLIENT_ID
DISCORD_REDIRECT_URI=https://donjon-rouge-dashboard.onrender.com/auth/callback
```

---

## Authentification Discord OAuth2

### Flow
1. Utilisateur clique "Se connecter avec Discord"
2. Redirect vers Discord OAuth2 avec scopes `identify guilds`
3. Discord redirige vers `/auth/callback?code=XXX`
4. Le frontend envoie le code au backend → backend échange contre un access token
5. Backend récupère les infos utilisateur Discord + vérifie que l'utilisateur est dans le serveur Donjon Rouge ET est admin
6. Si OK → renvoie un JWT token → stocké dans localStorage
7. Toutes les routes protégées vérifient ce token

### Vérification admin
- L'utilisateur doit être dans le serveur `610767309031866371`
- ET avoir le rôle Chef `611123759864348672` OU être CyberAlf `610765755553939456`

### Nouvelle route backend — `POST /api/auth/discord`
```js
// Reçoit { code } du frontend
// Échange avec Discord → access token
// GET https://discord.com/api/users/@me → infos user
// GET https://discord.com/api/users/@me/guilds → vérifie membership
// Vérifie rôle Chef dans le serveur
// Renvoie { token, user: { id, username, avatar } }
```

---

## Design — Palette Donjon Rouge

```js
// tailwind.config.js
colors: {
  dr: {
    red:    '#8B0000',  // rouge foncé
    'red-light': '#C0392B',
    black:  '#111111',
    dark:   '#1A1A1A',
    card:   '#222222',
    border: '#333333',
    gold:   '#FFD700',
    'gold-light': '#FFC107',
    text:   '#E0E0E0',
    muted:  '#888888',
  }
}
```

### Layout général
- **Fond :** `#111111`
- **Sidebar :** `#1A1A1A` avec bordure rouge à gauche sur l'item actif
- **Cards :** `#222222` avec bordure `#333333`
- **Accents :** rouge `#8B0000` / or `#FFD700`
- **Police :** Inter (Google Fonts)

---

## Page Login (`/login`)

```
[Logo Donjon Rouge centré]
[Titre : "Dashboard — Donjon Rouge"]
[Sous-titre : "Réservé aux administrateurs"]
[Bouton : "🔵 Se connecter avec Discord"]
```

---

## Sidebar (navigation)

```
[Avatar + Nom Discord]
[Logo DR]

─── GÉNÉRAL ───
🏠 Accueil
👥 Membres

─── CONFIGURATION ───
👋 Arrivées & Départs
✉️ Messages GDC
🎂 Anniversaires
📊 Sondages
🗺️ Route de l'Infinie

─── SYSTÈME ───
⚙️ Configuration bot
📋 Logs
```

---

## Page Accueil (`/`)

Stats en cards :

```
[DR1 : 39 membres]  [DR2 : 14 membres]  [Membres liés CoC : 45]
[Guerre DR1 : En cours]  [Guerre DR2 : Entre deux rounds]
[JDC : Actif — Tier VI]  [Raid : Inactif]
[Anniversaires aujourd'hui : 2]  [Sondages actifs : 1]
```

---

## Page Arrivées & Départs (`/welcome`)

### Section Message d'arrivée
- Textarea pour modifier le DM envoyé aux nouveaux membres
- Clé Supabase : `welcome_dm_msg`
- Variables disponibles affichées en badge : `{username}` `{server}`

### Section Message de départ
- Input pour le titre de l'embed
- Textarea pour la description
- Clés Supabase : `departure_title` / `departure_desc`
- Variable disponible : `{user}`

### Prévisualisation en temps réel (droite)
- Aperçu de l'embed comme Discord le rendrait

### Barre de sauvegarde
- Boutons "Réinitialiser" et "Sauvegarder" qui apparaissent si modifications

---

## Page Messages GDC (`/messages`)

### Message Dimanche 21h
- Textarea avec le message
- Clé Supabase : `gdc_msg_dimanche`

### Message Mardi 21h
- Textarea avec le message
- Clé Supabase : `gdc_msg_mardi`

### Barre de sauvegarde identique

---

## Page Anniversaires (`/birthdays`)

- Liste des membres inscrits avec date (JJ/MM et âge si année renseignée)
- Bouton pour supprimer une inscription
- Stats : nombre d'inscrits, prochain anniversaire

---

## Page Sondages (`/polls`)

- Liste des sondages actifs et terminés
- Pour chaque sondage : question, options, votes, % résultats
- Bouton "Terminer" pour les sondages actifs

---

## Page Route de l'Infinie (`/route-infinie`)

- Nombre actuel atteint
- Dernier joueur
- Cadeau actuel défini
- Formulaire pour définir nouveau cadeau (nombre + description)
- Bouton Reset

---

## Backend — nouvelles routes API

Ajouter dans le backend existant (`donjon-rouge-api`) :

```
POST /api/auth/discord          — échange code OAuth2
GET  /api/auth/me               — infos utilisateur connecté
GET  /api/dashboard/stats       — stats générales
GET  /api/dashboard/config      — valeurs bot_config
POST /api/dashboard/config      — mise à jour bot_config
GET  /api/dashboard/birthdays   — liste anniversaires
DELETE /api/dashboard/birthdays/:discord_id
GET  /api/dashboard/polls       — liste sondages
POST /api/dashboard/polls/:id/end — terminer sondage
GET  /api/dashboard/route       — état route de l'infinie
POST /api/dashboard/route       — update cadeau / reset
```

---

## Sécurité

- Toutes les routes `/api/dashboard/*` vérifient le JWT token
- Le JWT contient `{ discord_id, username, avatar }`
- Expiration du token : 24h
- Seuls les admins (rôle Chef ou CyberAlf) peuvent accéder

---

## Déploiement Render

### Service : `donjon-rouge-dashboard`
- Type : **Static Site**
- Build command : `cd dashboard && npm install && npm run build`
- Publish directory : `dashboard/dist`
- Variables d'environnement : `VITE_*` ci-dessus

### Service backend existant : `donjon-rouge-api`
- Ajouter les nouvelles routes `/api/auth/*` et `/api/dashboard/*`
- Ajouter les variables `DISCORD_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_REDIRECT_URI`

---

## Plan de développement par phases

### Phase 1 (aujourd'hui)
- Créer le projet dashboard (Vite + React + Tailwind)
- Implémenter Discord OAuth2 (login + callback + vérification admin)
- Layout principal (sidebar + header)
- Page Accueil avec stats
- Page Arrivées & Départs

### Phase 2 (prochaine session)
- Page Messages GDC
- Page Anniversaires
- Page Sondages
- Page Route de l'Infinie

### Phase 3
- Page Membres
- Page Configuration bot
- Logs
