# FEATURE — Page E-Sport Donjon Rouge

## Objectif

Créer une page e-sport dédiée à l'équipe DR E-Sport qui participe à la Town Hall Cup TH15 2026, avec un bouton stylé sur la page d'accueil et un système d'activation/désactivation réservé au SuperAdmin.

## Clan E-Sport
- **Tag :** `#2CLY9L0LY`
- **Nom :** DR E-Sport
- **Membres :** OryxBattel, Youles, Cookie (déjà dans discord_links)
- **Compétition :** Town Hall Cup TH15 2026 — format 3v3 — prize pool $8,250
- **Démarrage :** 26 juin 2026

---

## Étape 0 — Inspection obligatoire

Avant de coder, lire :
- `frontend/src/pages/Home.jsx` — page d'accueil existante
- `frontend/src/App.jsx` — routing existant
- `frontend/src/components/Navbar.jsx` — navigation existante
- `backend/src/routes/` — pattern routes existantes
- `backend/src/index.js` — pour voir comment ajouter une nouvelle route
- Vérifier les tags CoC de OryxBattel, Youles et Cookie dans `discord_links` via Supabase

---

## Feature 1 — Comptabilisation membres E-Sport en page d'accueil

### Modification backend
Dans la route qui retourne le nombre de membres du clan, ajouter les membres de `#2CLY9L0LY` si la feature e-sport est activée (`esport_enabled = true` dans `bot_config`).

### Affichage page d'accueil
Ajouter sous les stats membres existantes :
```
DR1 : 42 membres | DR2 : 6 membres | E-Sport : 3 membres
```

---

## Feature 2 — Bouton stylé page d'accueil

### Condition d'affichage
Visible uniquement si `esport_enabled = true` dans `bot_config`.

### Design
Bouton/bannière accrocheur style e-sport :
```
🏆 DR E-SPORT — Town Hall Cup TH15 2026
Suivez le parcours de notre équipe →
```
- Fond dégradé rouge/noir avec effet brillant
- Icône trophée dorée
- Renvoie vers `/esport`

---

## Feature 3 — Page E-Sport (`/esport`)

### Accès
Tous les membres connectés (rôle LIE minimum)

### Sections

#### Header
```
🏆 DR E-SPORT
Town Hall Cup TH15 2026
Format 3v3 | Prize pool : $8,250
```

#### L'équipe (données temps réel via API CoC clan #2CLY9L0LY)
Pour chaque membre :
- Avatar (initiales colorées)
- Pseudo CoC
- HDV (Town Hall level)
- Trophées
- Rôle dans le clan e-sport

#### Stats du clan e-sport (données API CoC)
- Nombre de guerres jouées
- Ratio victoires/défaites
- Points de clan

#### Résultats (saisie manuelle par SuperAdmin)
Table des matchs :
| Round | Adversaire | Score | Résultat |
- Bouton "Ajouter un résultat" visible SuperAdmin uniquement
- Modal : round, adversaire, score DR, score adversaire, victoire/défaite

#### Bouton Activer/Désactiver (SuperAdmin uniquement)
- Toggle visible uniquement pour CyberAlf
- Met à jour `esport_enabled` dans `bot_config`
- Quand désactivé : page inaccessible + bouton page d'accueil masqué

---

## Nouvelle table Supabase — `esport_results`

```sql
CREATE TABLE IF NOT EXISTS esport_results (
  id          SERIAL PRIMARY KEY,
  round       TEXT NOT NULL,
  opponent    TEXT NOT NULL,
  score_dr    INTEGER NOT NULL,
  score_opp   INTEGER NOT NULL,
  won         BOOLEAN NOT NULL,
  played_at   DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Fichiers à créer/modifier

### Backend
| Fichier | Action |
|---------|--------|
| `backend/src/routes/esport.js` | Nouveau — GET /clan-info, GET /results, POST /results, DELETE /results/:id, PUT /esport-enabled |
| `backend/src/index.js` | Ajouter app.use('/api/esport', esportRoutes) |

### Frontend
| Fichier | Action |
|---------|--------|
| `frontend/src/pages/Esport.jsx` | Nouvelle page complète |
| `frontend/src/pages/Home.jsx` | Ajouter bouton e-sport + compteur membres e-sport |
| `frontend/src/App.jsx` | Ajouter route /esport avec PrivateRoute |
| `frontend/src/components/Navbar.jsx` | Pas de lien nav — accès uniquement via bouton page d'accueil |

---

## Contraintes

- La page et le bouton sont masqués si `esport_enabled = false` dans `bot_config`
- Le bouton toggle est visible uniquement pour `coc_name === 'CyberAlf'` ou `site_role === 'superadmin'`
- Ne rien casser dans les pages existantes
- Données membres récupérées en temps réel via `/api/coc/clan/esport/members` ou endpoint similaire

