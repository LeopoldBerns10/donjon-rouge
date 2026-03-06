⚠️ POINTS DE VIGILANCE CRITIQUES — VÉRIFIER DEUX FOIS

🔴 PRIORITÉ ABSOLUE :
1. Le rôle "admin" de l'API CoC = "Aîné" — PAS "Admin", PAS "Ancien", PAS "Modérateur". 
   Chercher dans TOUS les fichiers .jsx et .js toute occurrence de "admin", "Admin", "leader", 
   "coLeader", "member" affichée telle quelle → remplacer par translateRole()

2. Les URLs des images troupes → tester CHAQUE catégorie (troops/heroes/equipment/pets/siege)
   avec un console.log avant de valider. Un nom mal orthographié = image cassée.

3. La page Guilde → vérifier que le clic sur une ligne redirige bien vers /tracker/player/TAG
   avec le tag encodé (encodeURIComponent)

🟡 VÉRIFICATIONS STANDARD :
4. Après chaque fichier modifié → vérifier qu'il n'y a pas de import manquant
5. cocHelpers.js → doit être importé dans TOUS les fichiers qui affichent des rôles
6. Ne pas casser les fichiers existants qui fonctionnent (Navbar, Footer, DragonBackground)

# PROMPT CLAUDE CODE V2 — DONJON ROUGE
## Corrections et nouvelles fonctionnalités

Tu travailles sur le projet **Donjon Rouge** — site communautaire pour guilde Clash of Clans.
Repo GitHub : `https://github.com/LeopoldBerns10/donjon-rouge`
Stack : React + Vite + Tailwind (frontend) / Node.js + Express (backend) / Supabase (BDD)

---

## 🔴 CORRECTION 1 — Traduction des rôles CoC

L'API CoC retourne les rôles en anglais. Il FAUT traduire partout dans le frontend :

| Valeur API | Affichage correct |
|------------|-------------------|
| `leader`   | **Chef**          |
| `coLeader` | **Co-Chef**       |
| `admin`    | **Aîné**          |
| `member`   | **Membre**        |

⚠️ ATTENTION : `admin` dans l'API CoC = **Aîné** (rang dans le clan), ce n'est PAS un administrateur du site web. Ne jamais afficher "Admin" pour ce rôle.

Crée une fonction utilitaire réutilisable dans `frontend/src/utils/cocHelpers.js` :
```js
export function translateRole(role) {
  const roles = {
    leader: 'Chef',
    coLeader: 'Co-Chef',
    admin: 'Aîné',
    member: 'Membre'
  };
  return roles[role] || role;
}
```

---

## 🔴 CORRECTION 2 — Couleurs des rôles

Partout où un rôle est affiché (page Guilde, profil joueur, tracker), appliquer ces couleurs :

| Rôle      | Couleur     | Classe Tailwind          |
|-----------|-------------|--------------------------|
| Chef      | Rouge       | `text-red-500` + badge `bg-red-900/50 border-red-500` |
| Co-Chef   | Violet      | `text-purple-400` + badge `bg-purple-900/50 border-purple-500` |
| Aîné      | Bleu        | `text-blue-400` + badge `bg-blue-900/50 border-blue-500` |
| Membre    | Vert        | `text-green-400` + badge `bg-green-900/50 border-green-500` |

Crée une fonction dans `cocHelpers.js` :
```js
export function getRoleColor(role) {
  const colors = {
    leader: 'text-red-500',
    coLeader: 'text-purple-400',
    admin: 'text-blue-400',
    member: 'text-green-400'
  };
  return colors[role] || 'text-gray-400';
}

export function getRoleBadgeClass(role) {
  const badges = {
    leader: 'bg-red-900/50 border border-red-500 text-red-400',
    coLeader: 'bg-purple-900/50 border border-purple-500 text-purple-400',
    admin: 'bg-blue-900/50 border border-blue-500 text-blue-400',
    member: 'bg-green-900/50 border border-green-500 text-green-400'
  };
  return badges[role] || 'bg-gray-800 border border-gray-600 text-gray-400';
}
```

---

## 🔴 CORRECTION 3 — Images des troupes, équipements, familiers, machines

### Problème actuel
Les noms sont tronqués ("Barb", "Arch") et les images ne chargent pas.

### Solution — Mapping complet des noms

Les images viennent de :
```
https://raw.githubusercontent.com/Statscell/clash-assets/main/troops/{NomAnglais}.png
https://raw.githubusercontent.com/Statscell/clash-assets/main/heroes/{NomAnglais}.png
https://raw.githubusercontent.com/Statscell/clash-assets/main/equipment/{NomAnglais}.png
https://raw.githubusercontent.com/Statscell/clash-assets/main/pets/{NomAnglais}.png
https://raw.githubusercontent.com/Statscell/clash-assets/main/siege/{NomAnglais}.png
```

Crée dans `cocHelpers.js` une fonction qui construit l'URL de l'image :
```js
const BASE = 'https://raw.githubusercontent.com/Statscell/clash-assets/main';

export function getTroopImageUrl(name, category = 'troops') {
  // Nettoyer le nom : enlever espaces, accents, caractères spéciaux
  const clean = name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
  return `${BASE}/${category}/${clean}.png`;
}
```

### Mapping des catégories depuis l'API CoC
L'API retourne `player.troops`, `player.heroes`, `player.heroEquipment`, `player.spells`, `player.troops` (avec `village: "builderBase"` pour la base du constructeur).

Pour chaque item de ces tableaux, utiliser :
- `item.name` → nom anglais exact retourné par l'API → construire l'URL
- Fallback si image introuvable : carré gris `#2a2a2a` avec le niveau affiché

### Affichage des items
Chaque item doit afficher :
- Image 48x48px (ou 40x40 pour équipements)
- Niveau en badge jaune en bas à droite
- Barre de progression rouge/or en bas (niveau actuel / max level)
- Nom complet au survol (tooltip)
- Fond gris foncé `#1a1a1a` avec bordure `#333`

---

## 🔴 CORRECTION 4 — Images HDV (Hôtel de Ville)

Les images HDV viennent de :
```
https://raw.githubusercontent.com/Statscell/clash-assets/main/townhalls/TH{niveau}.png
```
Exemples : `TH18.png`, `TH17.png`, `TH16.png`...

Dans la carte joueur (profil + liste guilde), afficher l'image HDV réelle au lieu du simple chiffre.

---

## 🔴 CORRECTION 5 — Onglet RANKED (profil joueur)

L'API CoC ne fournit pas directement l'historique ranked. Voici ce que l'onglet doit afficher :

### Section 1 — Saison en cours
Afficher les données disponibles dans `player` :
- `player.trophies` → Trophées actuels
- `player.league` → Ligue actuelle avec icône (`player.league.iconUrls.medium`)
- `player.legendStatistics` si disponible (certains joueurs ont cet objet) :
  - `legendStatistics.currentSeason.trophies` → Trophées fin de journée légendaire
  - `legendStatistics.currentSeason.rank` → Rang mondial si disponible
  - `legendStatistics.bestSeason` → Meilleure saison historique
  - `legendStatistics.previousSeason` → Saison précédente

### Section 2 — Historique saisons
Si `player.legendStatistics` existe, afficher :
- Saison précédente : trophées + rang
- Meilleure saison : trophées + rang + date
- Sinon afficher : "Ce joueur n'a pas de données de ligue Légende disponibles"

### Section 3 — Ligue Builder Base
- `player.builderBaseTrophies`
- `player.builderBaseLeague` avec icône

---

## 🟡 NOUVELLE FONCTIONNALITÉ — Page "Guilde"

### Description
Nouvelle page accessible depuis la navbar : **Guilde** (entre "Accueil" et "Tracker")
Route : `/guilde`
Fichier : `frontend/src/pages/Guilde.jsx`

### Section 1 — Stats globales du clan (en haut)
Appel API : `GET /api/coc/clan`

Afficher en cards style dark/rouge :
- 🏰 Niveau du clan (clanLevel)
- 👥 Membres (members/50)
- ⚔️ Guerres gagnées (warWins) / Nulles (warTies) / Perdues (warLosses)
- 🏆 Points de clan (clanPoints)
- 🌟 Ligue de guerre actuelle (warLeague.name)
- 🏛️ Capital Hall niveau (clanCapital.capitalHallLevel)
- 💎 Points Capital (clanCapitalPoints)
- 🔥 Série victoires en guerre (warWinStreak)
- 📍 Localisation (location.name)

Afficher aussi le badge du clan (badgeUrls.large) en grand à gauche avec le nom du clan et sa description.

### Section 2 — Tableau des membres

Tableau trié par `clanRank` (rang dans le clan).

**Colonnes :**
1. **#** → rang dans le clan
2. **Joueur** → image HDV (petit, 32px) + nom du joueur
3. **Rôle** → badge coloré (Chef/Co-Chef/Aîné/Membre) avec couleurs définies en CORRECTION 2
4. **Ligue** → icône de ligue (`league.iconUrls.small`) + nom de la ligue
5. **HDV** → niveau hôtel de ville
6. **Trophées** → avec icône trophée 🏆
7. **Dons** → avec icône 
8. **Expérience** → niveau expérience (expLevel)

**Comportement :**
- Chaque ligne est cliquable → redirige vers `/tracker/player/{tag}` (profil joueur)
- Hover : légère surbrillance rouge/dorée
- Sur mobile : colonnes simplifiées (rang, joueur, rôle, HDV, trophées)

**Style :**
- Fond dark `#111`
- Header tableau : fond `#1a1a1a` texte doré
- Lignes alternées : `#0d0d0d` / `#111`
- Bordures subtiles `#2a2a2a`

---

## 🟡 MODIFICATION — Navbar

Ajouter **"Guilde"** dans la navbar entre "Accueil" et "Tracker".
La navbar doit avoir dans l'ordre :
1. Logo + "DONJON ROUGE"
2. Accueil
3. **Guilde** ← nouveau
4. Tracker
5. Forum
6. Vitrine
7. Discord (bouton bleu)

---

## 📋 FICHIERS À MODIFIER / CRÉER

### Créer
- `frontend/src/utils/cocHelpers.js` — fonctions utilitaires (traduction rôles, couleurs, URLs images)
- `frontend/src/pages/Guilde.jsx` — nouvelle page guilde

### Modifier
- `frontend/src/components/Navbar.jsx` — ajouter lien Guilde
- `frontend/src/App.jsx` — ajouter route `/guilde`
- `frontend/src/pages/PlayerProfile.jsx` — fix images troupes/héros/équipements + fix onglet Ranked + fix traduction rôles
- `frontend/src/pages/Tracker.jsx` — fix couleurs rôles + fix traduction "Aîné"
- Tout fichier qui affiche des rôles CoC → utiliser `translateRole()` et `getRoleBadgeClass()`

---

## ⚠️ RÈGLES IMPORTANTES

1. **Ne jamais afficher "admin"** pour le rôle CoC → toujours "Aîné"
2. **Images avec fallback** → si l'image ne charge pas, afficher un carré gris avec le niveau
3. **Tags CoC** → toujours encoder avec `encodeURIComponent()` dans les URLs API
4. **Cache** → les appels API CoC passent par le backend qui cache 10 min dans Supabase
5. **Pas de localStorage** → utiliser React state
6. **Fonts** → Cinzel + Cinzel Decorative (déjà importées)
7. **Couleurs principales** → Rouge `#dc2626`, Or `#d4af37`, Fond `#0a0a0a`

---

## 🧪 TEST APRÈS MODIFICATIONS

Tester avec le joueur **CyberAlf** tag `#YQCULYQ90` :
- Vérifier que son rôle affiche **"Chef"** en rouge (pas "leader" ni "admin")
- Vérifier que les images HDV18 s'affichent
- Vérifier que les troupes ont leurs vraies images
- Vérifier que l'onglet Ranked affiche ses stats Légende
- Vérifier que la page Guilde affiche tous les 33 membres avec leurs icônes de ligue
