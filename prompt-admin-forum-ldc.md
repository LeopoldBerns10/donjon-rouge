# PROMPT — Zone Admin + Forum Discord-like + LDC Détail 7j

## CONTEXTE
- Frontend : Vite + React
- Backend : Node.js sur Render
- Base de données : Supabase (déjà configuré)
- Auth existante : connexion via tag CoC (#JOUEUR) + mot de passe
  (mot de passe par défaut = tag CoC, changement forcé à la première connexion)
- DA du site : sombre #0d0d0d, accent rouge #dc2626, uppercase militaire

---

# PARTIE 1 — ZONE ADMINISTRATEUR

## Structure des rôles (Supabase)

Ajouter une colonne `role` dans la table `users` :
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'member';
-- Valeurs possibles : 'superadmin' | 'admin' | 'member'
```

Définir les deux super admins au démarrage :
```sql
UPDATE users SET role = 'superadmin' 
WHERE email = 'leopold.berns10@gmail.com' OR coc_name = 'CyberAlf';
```

## Règles de permissions
```
superadmin (leopold.berns10@gmail.com + CyberAlf) :
  ✅ Voir tous les comptes + statut connexion
  ✅ Voir qui a changé son mot de passe
  ✅ Reset mot de passe d'un membre → remet le tag CoC comme mdp
  ✅ Promouvoir un membre → role 'admin'
  ✅ Destituer un admin → role 'member'
  ✅ Supprimer un accès (désactiver un compte)
  ✅ Tout ce que admin peut faire

admin (promu par superadmin) :
  ✅ Voir tous les comptes + statut connexion
  ✅ Voir qui a changé son mot de passe
  ✅ Reset mot de passe d'un membre
  ❌ Ne peut PAS promouvoir d'autres membres
  ❌ Ne peut PAS destituer
  ❌ Ne peut PAS supprimer des accès

member :
  ❌ Aucun accès à la zone admin
```

## Table Supabase à créer/modifier
```sql
-- Tracking des sessions
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT false
);

-- Colonne mot de passe personnalisé
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  has_custom_password BOOLEAN DEFAULT false;
-- Passer à true quand le joueur change son mot de passe la première fois

-- Colonne compte désactivé
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  is_disabled BOOLEAN DEFAULT false;
```

## Route backend à créer
```
GET  /api/admin/users          → liste tous les users avec role, last_seen, has_custom_password
POST /api/admin/reset-password  → body: { userId } → remet le tag CoC comme mdp
POST /api/admin/promote         → body: { userId } → role = 'admin' (superadmin seulement)
POST /api/admin/demote          → body: { userId } → role = 'member' (superadmin seulement)
POST /api/admin/disable         → body: { userId } → is_disabled = true (superadmin seulement)
POST /api/admin/enable          → body: { userId } → is_disabled = false (superadmin seulement)
```

## Page /admin (accessible si role = 'admin' ou 'superadmin')

### Header
```
ZONE ADMINISTRATION
Connecté en tant que : [nom] — [rôle en badge]
```

### Tableau des membres
Colonnes :
```
JOUEUR | RÔLE | STATUT CONNEXION | MOT DE PASSE | DERNIÈRE CONNEXION | ACTIONS
```

**STATUT CONNEXION :**
- 🟢 point vert animé = connecté (last_seen < 5 minutes)
- 🟡 point jaune = récent (last_seen < 30 minutes)  
- ⚫ point gris = hors ligne

**MOT DE PASSE :**
- Badge vert "PERSONNALISÉ" si has_custom_password = true
- Badge orange "PAR DÉFAUT" si has_custom_password = false
  (= le joueur n'a jamais changé son mot de passe, utilise encore son tag)

**ACTIONS selon le rôle connecté :**

Pour superadmin :
```
[🔄 Reset MDP] [⬆️ Promouvoir] [⬇️ Destituer] [🚫 Désactiver]
```
- Reset MDP : confirmation modale → remet le tag CoC comme mdp
- Promouvoir : visible uniquement si role = 'member'
- Destituer : visible uniquement si role = 'admin'
- Désactiver/Réactiver : toggle

Pour admin :
```
[🔄 Reset MDP]
```
Uniquement reset, pas de promotion ni suppression.

### Style
```
Même DA que le reste du site
Header zone admin : border-top 2px solid #dc2626
Badges rôle :
  superadmin → bg-red-900 text-red-400 border border-red-600
  admin      → bg-orange-900 text-orange-400 border border-orange-600
  member     → bg-gray-900 text-gray-400 border border-gray-600
Point connexion animé : animate-pulse pour le vert
```

---

# PARTIE 2 — REFONTE FORUM (style Discord)

## Structure Supabase
```sql
-- Catégories (canaux Discord)
CREATE TABLE forum_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji ou nom d'icône
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts dans une catégorie
CREATE TABLE forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT, -- URL image uploadée
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Réactions sur les posts
CREATE TABLE forum_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  reaction_type TEXT CHECK (reaction_type IN ('up', 'down', 'heart')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);
```

Insérer les catégories par défaut :
```sql
INSERT INTO forum_categories (name, description, icon, order_index) VALUES
('📢 Annonces', 'Annonces officielles du clan', '📢', 1),
('⚔️ Stratégie GDC', 'Bases, compositions et tactiques', '⚔️', 2),
('🏆 Ligues de Guerre', 'Organisation et résultats LDC', '🏆', 3),
('💎 Raids Capital', 'Coordination des raids', '💎', 4),
('🎮 Général', 'Discussion générale', '🎮', 5),
('🆕 Recrutement', 'Candidatures et présentations', '🆕', 6);
```

## Routes backend
```
GET  /api/forum/categories              → liste toutes les catégories
GET  /api/forum/categories/:id/posts    → posts d'une catégorie (triés par date desc)
POST /api/forum/posts                   → créer un post (auth requise)
POST /api/forum/posts/:id/reactions     → ajouter/toggle une réaction
GET  /api/forum/posts/:id/reactions     → compter les réactions d'un post
POST /api/forum/upload                  → upload image → retourne URL Supabase Storage
DELETE /api/forum/posts/:id             → supprimer un post (auteur ou admin/superadmin)
```

## Layout de la page /forum

### Structure 2 colonnes (comme Discord)
```
┌─────────────────┬────────────────────────────────────────┐
│   SIDEBAR       │   CONTENU PRINCIPAL                    │
│   (w-64)        │                                        │
│                 │                                        │
│  📢 Annonces   │   [Liste des posts de la catégorie]    │
│  ⚔️ Stratégie  │                                        │
│  🏆 Ligues      │                                        │
│  💎 Raids       │                                        │
│  🎮 Général    │                                        │
│  🆕 Recrut.    │                                        │
│                 │                                        │
└─────────────────┴────────────────────────────────────────┘
```

### Sidebar (gauche)
```
Titre : "FORUMS" uppercase tracking-widest text-xs text-gray-500

Chaque catégorie :
- bg transparent par défaut
- Hover : bg #1a1a1a
- Actif : bg #1a1a1a border-left 2px solid #dc2626 text-white
- Icône + nom + badge nombre de posts non lus (si applicable)

Style sidebar : bg #0a0a0a, border-right 1px solid #1a1a1a
```

### Zone contenu (droite)

**Header catégorie :**
```
[Icône] NOM DE LA CATÉGORIE          [+ Nouveau post]
Description de la catégorie
─────────────────────────────────────────────────────
```

**Liste des posts :**
Chaque post :
```
┌──────────────────────────────────────────────────────┐
│ 📌 [si pinné]  TITRE DU POST              [date]    │
│ Par [AUTEUR] — [badge rôle auteur]                   │
│                                                      │
│ [Aperçu du contenu, 2 lignes max...]                 │
│ [miniature image si image jointe]                    │
│                                                      │
│ 👍 12   👎 2   ❤️ 5        [Voir le post →]         │
└──────────────────────────────────────────────────────┘
```

**Vue d'un post ouvert (modal ou page dédiée) :**
```
TITRE DU POST
Par [AUTEUR] — [date complète]
────────────────────────────────
[Contenu complet]
[Image si présente — max-w-full, rounded]

────────────────────────────────
RÉACTIONS :
[👍 Pouce vert  12]  [👎 Pouce rouge  2]  [❤️ Cœur  5]

Cliquer sur une réaction = toggle (ajouter/retirer)
Un utilisateur ne peut avoir qu'UNE réaction par type par post
```

**Formulaire nouveau post :**
```
TITRE : [input text]
CONTENU : [textarea, min 4 lignes]
IMAGE : [bouton upload, preview avant envoi]
[Annuler]  [Publier →]
```

### Style réactions
```javascript
// Boutons réactions
👍 : bg-green-900/30 border border-green-700 text-green-400
     hover : bg-green-900/60
     actif (déjà cliqué) : bg-green-700 text-white

👎 : bg-red-900/30 border border-red-700 text-red-400
     hover : bg-red-900/60
     actif : bg-red-700 text-white

❤️ : bg-pink-900/30 border border-pink-700 text-pink-400
     hover : bg-pink-900/60
     actif : bg-pink-700 text-white
```

---

# PARTIE 3 — LDC DÉTAIL 7 JOURS

## Contexte
Dans Guilde → GDC/LDC → Ligues de Guerre (LDC), 
afficher le détail des 7 matchs de la semaine LDC en cours.

## Endpoint API CoC à utiliser
```
GET https://api.clashofclans.com/v1/clans/{clanTag}/currentwar/leaguegroup
→ retourne les groupes et rounds de la LDC en cours

GET https://api.clashofclans.com/v1/clanwarleagues/wars/{warTag}
→ retourne le détail d'un match LDC spécifique
```

## Route backend à créer
```
GET /api/coc/ldc/current     → récupère le groupe LDC + tous les rounds
GET /api/coc/ldc/war/:warTag → détail d'un match LDC
```

## Structure d'affichage

### Header LDC
```
LIGUE DE GUERRE DE CLANS — SAISON EN COURS
[Badge ligue de guerre] Semaine X
[Notre clan] — Groupe X — [X équipes]
```

### Les 7 rounds (s'incrémente au fil des jours)

Pour chaque round disponible, afficher une card :
```
┌────────────────────────────────────────────────────────┐
│  JOUR 1  •  [date]              [VICTOIRE / DÉFAITE /  │
│                                  EN COURS / À VENIR]   │
│                                                        │
│  DONJON ROUGE          vs          [ADVERSAIRE]        │
│  ⭐ XX étoiles                     ⭐ XX étoiles       │
│  XX attaques / XX                  XX attaques / XX    │
│  XX% destruction                   XX% destruction     │
│                                                        │
│  [Voir le détail des attaques ↓]                       │
└────────────────────────────────────────────────────────┘
```

### Détail déroulant d'un match (clic sur "Voir le détail")
Tableau des attaques :
```
JOUEUR          | CIBLE           | ⭐  | %    | RÉSULTAT
─────────────────────────────────────────────────────────
NomJoueur       | NomAdversaire   | ⭐⭐⭐ | 100% | ✅
NomJoueur2      | NomAdversaire2  | ⭐⭐  | 87%  | ✅
...
```

### Résumé global en bas
```
┌──────────────────────────────────────────────────────┐
│  BILAN DE LA SEMAINE                                  │
│  Matchs joués : X / 7                                │
│  Victoires : X  |  Défaites : X  |  Nuls : X        │
│  Total étoiles : XXX                                 │
│  Meilleur attaquant : [Nom] — XX étoiles             │
└──────────────────────────────────────────────────────┘
```

### Rounds à venir
Pour les rounds pas encore joués :
```
┌────────────────────────────────────────────────────┐
│  JOUR X  •  [date prévue]          ⏳ À VENIR      │
│  Adversaire non encore connu                       │
└────────────────────────────────────────────────────┘
```

### Style badges résultat
```
VICTOIRE  → bg-green-900 text-green-400 border border-green-700
DÉFAITE   → bg-red-900 text-red-400 border border-red-700
EN COURS  → bg-yellow-900 text-yellow-400 border border-yellow-700 animate-pulse
À VENIR   → bg-gray-900 text-gray-500 border border-gray-700
```

Étoiles :
```
⭐⭐⭐ → text-yellow-400
⭐⭐  → text-yellow-600
⭐   → text-yellow-800
0   → text-gray-600
```

---

# STYLE GLOBAL (rappel DA du site)
```
Background : #0d0d0d
Cards : #111111, border 1px solid #1f1f1f
Accent : #dc2626
Texte : #f0f0f0
Secondaire : #666666
Titres : uppercase, letter-spacing 0.1em, text-xs
Hover cards : border #dc2626, box-shadow 0 0 20px rgba(220,38,38,0.1)
Transitions : all 0.2s ease
```

---

# CHECKLIST FINALE
## Partie 1 — Admin
- [ ] Colonne `role` ajoutée dans Supabase
- [ ] Colonnes `has_custom_password` et `is_disabled` ajoutées
- [ ] Table `user_sessions` créée
- [ ] Routes backend admin créées et sécurisées
- [ ] Page /admin créée, accessible uniquement aux admins
- [ ] Tableau avec statut connexion (point coloré)
- [ ] Badge mot de passe personnalisé/défaut
- [ ] Actions reset/promouvoir/destituer/désactiver fonctionnelles
- [ ] superadmin uniquement peut promouvoir/destituer/supprimer

## Partie 2 — Forum
- [ ] Tables Supabase créées (categories, posts, reactions)
- [ ] Catégories par défaut insérées
- [ ] Routes backend forum créées
- [ ] Layout 2 colonnes sidebar + contenu
- [ ] Sidebar avec catégories cliquables
- [ ] Liste des posts par catégorie
- [ ] Vue détail d'un post
- [ ] Formulaire nouveau post avec upload image
- [ ] Réactions 👍👎❤️ fonctionnelles (toggle)
- [ ] Suppression post (auteur ou admin)

## Partie 3 — LDC
- [ ] Route backend /api/coc/ldc/current créée
- [ ] Route backend /api/coc/ldc/war/:warTag créée
- [ ] Affichage des 7 rounds avec statut
- [ ] Détail déroulant par match
- [ ] Tableau des attaques par match
- [ ] Bilan global de la semaine
- [ ] Rounds à venir affichés

## Global
- [ ] git add, commit "feat: admin + forum discord + ldc detail", push
- [ ] npm run build sans erreur
