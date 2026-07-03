# Lot 4 — Graphiques progression + Notifications temps réel (Dashboard)

## Objectif

Implémenter deux features sur le dashboard web (donjon-rouge-dashboard.onrender.com) :
1. Graphiques de progression (membres, trophées, donations) sur les derniers mois
2. Notifications temps réel quand un membre rejoint ou quitte le serveur Discord

## Contraintes

- Ne rien casser dans ce qui existe déjà sur le dashboard
- Utiliser recharts pour les graphiques (déjà disponible dans React)
- Grouper toutes les modifications dans un minimum de fichiers
- Le dashboard utilise React + Vite + Tailwind

---

## Feature 1 — Graphiques de progression

### Page
Nouvelle section dans la page **Accueil** du dashboard (`dashboard/src/pages/Home.jsx`)

### Données à afficher
3 graphiques :
1. **Évolution membres** — nombre de membres DR1 + DR2 sur les 6 derniers mois
2. **Trophées moyens** — moyenne des trophées des membres sur les 6 derniers mois
3. **Donations** — total des donations du clan sur les 6 derniers mois

### Source de données
- Nouvelle table Supabase `clan_snapshots` pour stocker les snapshots mensuels
- Le scheduler bot prend un snapshot le 1er de chaque mois

### Schéma table `clan_snapshots`
```sql
CREATE TABLE IF NOT EXISTS clan_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  clan_tag TEXT NOT NULL,
  member_count INTEGER,
  avg_trophies INTEGER,
  total_donations INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, clan_tag)
);
```

### Composant graphique
Utiliser `recharts` :
- LineChart pour évolution membres
- BarChart pour donations
- LineChart pour trophées moyens
- Design rouge/noir/or Donjon Rouge

### Route backend
- GET `/api/dashboard/snapshots` — retourne les 6 derniers snapshots DR1 + DR2

---

## Feature 2 — Notifications temps réel

### Emplacement
Coin supérieur droit du dashboard — icône cloche 🔔 avec badge compteur

### Événements notifiés
- 👋 Nouveau membre rejoint le serveur Discord
- 🚪 Membre a quitté le serveur Discord
- ⚔️ Guerre DR1/DR2 commencée
- 🎮 JDC commencé

### Implémentation
Utiliser **polling** toutes les 30 secondes (pas de WebSocket — trop complexe pour Render) :
- Nouvelle route GET `/api/dashboard/notifications` — retourne les événements des dernières 24h depuis `bot_config` et `discord_events`
- Le dashboard poll cette route toutes les 30s
- Affiche les nouvelles notifications avec un badge rouge

### Format notification
```
👋 [Il y a 5 min] Nouveau membre : @username a rejoint le serveur
🚪 [Il y a 1h] Départ : @username a quitté le serveur
⚔️ [Il y a 2h] Guerre DR1 commencée
```

---

## Fichiers à créer/modifier

### Bot
| Fichier | Action |
|---------|--------|
| `bot/src/scheduler.js` | Ajouter snapshot mensuel le 1er du mois à 8h |
| `bot/migrations/clan_snapshots.sql` | Nouveau — migration SQL |

### Backend dashboard
| Fichier | Action |
|---------|--------|
| `backend/src/controllers/dashboardController.js` | Ajouter getSnapshots + getNotifications |
| `backend/src/routes/dashboard.js` | Ajouter GET /snapshots et GET /notifications |

### Dashboard frontend
| Fichier | Action |
|---------|--------|
| `dashboard/src/pages/Home.jsx` | Ajouter section graphiques |
| `dashboard/src/components/Header.jsx` | Ajouter cloche notifications |
| `dashboard/src/components/NotificationPanel.jsx` | Nouveau — panel notifications |
| `dashboard/src/api/index.js` | Ajouter getSnapshots + getNotifications |

---

## Étape 0 obligatoire

Avant de coder, lire :
- `dashboard/src/pages/Home.jsx` (page existante)
- `dashboard/src/components/Header.jsx` (header existant)
- `backend/src/controllers/dashboardController.js` (pattern existant)
- `bot/src/scheduler.js` (pattern scheduler existant)

