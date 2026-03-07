# PROMPT CLAUDE CODE V3 — DONJON ROUGE
## Animations Dragon + Blazon

Tu travailles sur le projet **Donjon Rouge** — site communautaire pour guilde Clash of Clans.
Repo GitHub : `https://github.com/LeopoldBerns10/donjon-rouge`
Fichier principal à modifier : `frontend/src/pages/Home.jsx`
Nouveau composant à créer : `frontend/src/components/DragonScene.jsx`
Nouveau composant à créer : `frontend/src/components/DragonBlazón.jsx`
Nouveau composant à créer : `frontend/src/components/FireIntro.jsx`

---

## 🎨 DIRECTION ARTISTIQUE

Style : **Dark Fantasy médiéval — Rouge, Noir, Or subtil**
Ambiance : Puissant, mystérieux, vivant
Fonts déjà installées : Cinzel + Cinzel Decorative
Couleurs : `#dc2626` (rouge), `#0a0a0a` (fond noir), `#d4af37` (or subtil), `#1a0000` (rouge très sombre)

---

## 🔴 COMPOSANT 1 — FireIntro.jsx
### Effet souffle de dragon (intro unique)

Animation d'ouverture qui se joue **une seule fois** au premier chargement de la page d'accueil.

**Comportement :**
- Au chargement : overlay fullscreen noir par-dessus tout le site
- Des flammes Canvas descendent du haut vers le bas en 2.5 secondes
- Les flammes "brûlent" l'overlay et révèlent le site en dessous
- Après 3 secondes : l'overlay disparaît complètement
- Stocké dans sessionStorage (`dragonIntroPlayed`) pour ne jouer qu'une fois par session

**Technique Canvas pour les flammes :**
```jsx
// Particules de feu qui descendent du haut
// Chaque particule : position x aléatoire en haut, descend avec légère oscillation
// Couleurs : #ff4500 → #ff8c00 → #ffd700 avec opacité qui varie
// Taille : 8-20px, diminue en descendant
// Vitesse : rapide au centre, légèrement plus lente sur les bords
// Effet de traînée : chaque frame efface avec globalAlpha=0.1 pour effet de flou de mouvement
// Au fur et à mesure que les flammes descendent, elles "brûlent" des trous dans l'overlay noir
// Utiliser globalCompositeOperation = 'destination-out' pour effacer l'overlay là où passent les flammes
```

**Structure JSX :**
```jsx
// Position : fixed, z-index 9999, fullscreen
// Deux canvas superposés : un pour l'overlay noir, un pour les flammes
// Disparaît avec fadeOut après la fin de l'animation
```

---

## 🔴 COMPOSANT 2 — DragonBlazón.jsx (SVG)
### Blazon dessiné en SVG pur — logo du clan

**Design du blazon :**
- Forme : bouclier médiéval classique (pointe en bas, épaules arrondies)
- Couleur principale : `#8B0000` (rouge sang) avec dégradé vers `#1a0000` (rouge très sombre)
- Bordure : double bordure fine dorée `#d4af37` (1-2px) avec légère lueur
- Fond intérieur : texture sombre quasi-noire `#0d0000`

**Tête de dragon au centre du blazon :**
- Vue de face, légèrement de profil
- Cornes recourbées vers l'arrière
- Yeux : deux points dorés lumineux `#d4af37`
- Gueule légèrement entrouverte avec une flamme qui sort (petite)
- Style : lignes géométriques médiévales, pas réaliste — héraldique
- Couleur : rouge foncé `#cc0000` avec contours noirs `#1a0000`
- Petits détails dorés : tips des cornes, écailles suggérées

**Éléments décoratifs du blazon :**
- Deux petites épées croisées en bas du bouclier (héraldique)
- Lettre "DR" en Cinzel très petit en bas entre les épées
- Petits ornements aux coins supérieurs (fleurs de lys stylisées ou volutes)

**Deux usages :**
1. `<DragonBlazon size="large" />` → grand watermark derrière les textes de la page d'accueil (400-500px), `opacity: 0.15`, `z-index: 0`, centré en `position: absolute` derrière DONJON ROUGE / membres / boutons
2. Favicon SVG 32x32 dans `frontend/public/blazon.svg`

**Animation subtile sur le blazon :**
- Légère pulsation de la lueur dorée (scale 1.0 → 1.02, toutes les 3 secondes)
- Les yeux du dragon clignotent très subtilement (opacité 1 → 0.7 → 1, toutes les 4 secondes)

---

## 🔴 COMPOSANT 3 — DragonScene.jsx (Canvas)
### Dragon animé en bas à droite de la page d'accueil

**Position et taille :**
- Fixé en bas à droite : `position: fixed`, `bottom: 0`, `right: 0`
- Taille : ~40% de la hauteur de l'écran (max 500px)
- Semi-transparent : `opacity: 0.75`
- Z-index bas pour ne pas bloquer le contenu cliquable : `z-index: 1`

**Dessin du dragon en Canvas :**
Dessiner un dragon complet vu de 3/4 face-droite avec ces parties :
- Corps principal : masse centrale avec écailles suggérées
- Ailes repliées dans le dos (grandes, membranes)
- Tête : même style que le blazon — cornes, yeux dorés, gueule
- Pattes avant visibles, griffes au sol
- Queue qui sort par la droite et se recourbe
- Couleurs : rouge `#cc0000` dominant, ombres `#1a0000`, reflets `#ff4444`, détails or `#d4af37`

**Animations (toutes très subtiles, lentes) :**

1. **Respiration** (cycle 4 secondes)
   - Le corps entier scale légèrement : 1.0 → 1.015 → 1.0
   - Les flancs s'élargissent légèrement sur les côtés

2. **Tête qui tourne** (cycle 6 secondes)
   - La tête pivote de -3° à +3° autour du cou
   - Mouvement sinusoïdal fluide, jamais brusque

3. **Queue qui se balance** (cycle 5 secondes)
   - La pointe de la queue oscille de -8° à +8°
   - Mouvement plus rapide à la pointe, plus lent à la base (physique réaliste)

4. **Ailes légère vibration** (cycle 3 secondes)
   - Les tips des ailes bougent de ±2° — comme si le dragon était au repos mais vivant

5. **Yeux qui brillent** (cycle 4 secondes)
   - Petit glow doré autour des yeux qui pulse

**Technique :**
- Utiliser `requestAnimationFrame` pour toutes les animations
- Calculer chaque partie avec `Math.sin(time * speed) * amplitude`
- Dessiner le dragon en segments transformés séparément (tête, corps, ailes, queue)
- Utiliser `ctx.save()` et `ctx.restore()` pour isoler les transformations

---

## 🟡 MODIFICATION — Home.jsx

### Intégrer les nouveaux composants

⚠️ **NE PAS MODIFIER le contenu existant de Home.jsx** — uniquement AJOUTER les nouveaux composants autour/derrière.

```jsx
import FireIntro from '../components/FireIntro';
import DragonBlazon from '../components/DragonBlazon';
import DragonScene from '../components/DragonScene';

// Ajouter UNIQUEMENT :
// 1. <FireIntro /> au tout début (overlay par-dessus tout)
// 2. <DragonScene /> fixed bas droite (ne perturbe pas le layout)
// 3. <DragonBlazon /> en position absolute derrière les textes existants

// Le blazon se place dans le conteneur hero existant en position absolute :
// position: absolute, top: 50%, left: 50%, transform: translate(-50%, -50%)
// opacity: 0.15, z-index: 0, pointer-events: none
// Le conteneur parent doit avoir position: relative
```

### Favicon
Après avoir créé le SVG du blazon, exporter et utiliser comme favicon :
```html
<!-- Dans index.html -->
<link rel="icon" type="image/svg+xml" href="/blazon.svg" />
```
Sauvegarder le SVG du blazon dans `frontend/public/blazon.svg`

---

## ⚠️ RÈGLES IMPORTANTES

1. **Performance** → Les animations Canvas doivent tourner à 60fps, utiliser `requestAnimationFrame` correctement avec `cancelAnimationFrame` au unmount
2. **🚨 NE PAS MODIFIER LE DESIGN EXISTANT** → Zéro changement sur Navbar, Footer, DragonBackground, styles existants, couleurs existantes, layouts existants. Les 3 nouveaux composants s'ajoutent UNIQUEMENT, ils ne remplacent rien.
3. **sessionStorage** → L'intro feu ne joue qu'une fois par session (`dragonIntroPlayed`)
4. **Mobile** → Sur mobile (<768px), le dragon est plus petit (25% de l'écran) et l'intro reste fullscreen
5. **Cohérence visuelle** → Le dragon du blazon et le dragon de la scène doivent avoir le même style — même tête, mêmes cornes, mêmes yeux dorés
6. **Z-index** → FireIntro: 9999, DragonScene: 1 (derrière le contenu), DragonBlazon: normal flow

---

## 🧪 RÉSULTAT ATTENDU

À l'ouverture de https://donjon-rouge.onrender.com :
1. ✅ Flammes qui descendent et révèlent la page (2.5s)
2. ✅ Dragon rouge animé en bas à droite (respire, bouge la tête, balance la queue)
3. ✅ Blazon rouge/noir/or avec tête de dragon au centre de la page
4. ✅ Favicon = blazon miniature dans l'onglet du navigateur
5. ✅ Tout le reste du site (navbar, tracker, etc.) fonctionne normalement
