# PROMPT — Page Vitrine + Logo Navbar + Favicon + Hymne

## FICHIERS À INTÉGRER
Les fichiers suivants ont été ajoutés dans /public/ :
- /public/images/logo.png       → logo dragon rouge Donjon Rouge
- /public/images/recru.png      → affiche recrutement
- /public/audio/hymne.mp3       → hymne du clan

---

## 1. FAVICON — Remplacer l'icône d'onglet

Remplacer /public/favicon.ico par le logo du clan.
```bash
# Copier le logo comme favicon
cp public/images/logo.png public/favicon.png
```
Dans /app/layout.tsx, mettre à jour les metadata :
```typescript
export const metadata = {
  title: 'Donjon Rouge — Guilde Clash of Clans',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}
```

---

## 2. LOGO DANS LA NAVBAR

Remplacer le texte "DONJON ROUGE" dans la navbar par le logo image.
```tsx
// Dans le composant Navbar, remplacer le texte par :
<Link href="/">
  <img
    src="/images/logo.png"
    alt="Donjon Rouge"
    className="h-10 w-auto object-contain"
  />
</Link>
```
Garder le reste de la navbar identique.

---

## 3. NOUVELLE PAGE VITRINE (/vitrine)

Créer /app/vitrine/page.tsx

Ajouter "VITRINE" dans la navbar entre "GUILDE" et les autres liens.
Lien actif en rouge avec point • devant comme les autres.

### SECTION 1 — Hero Banner
```
Background : image /public/images/logo.png en fond flou (blur-sm, opacity-10)
sur fond #0d0d0d

Centré verticalement :
- Logo /public/images/logo.png en grand (h-48 ou h-56), centré
- Sous le logo : "GUILDE CLASH OF CLANS" en uppercase gris xs tracking-widest
- "#29292QPRC" en rouge #dc2626 xs
```

### SECTION 2 — Hymne du clan
```tsx
// Player audio stylé dans le thème du site
<div className="bg-[#111111] border border-[#dc2626] rounded-lg p-6">
  <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-4">
    ♪ HYMNE DU CLAN
  </h2>
  <audio
    controls
    className="w-full"
    style={{
      filter: 'invert(1) hue-rotate(180deg)', // pour un player sombre
    }}
  >
    <source src="/audio/hymne.mp3" type="audio/mpeg" />
  </audio>
</div>
```

Si le style CSS du player natif est trop basique, créer un player
custom avec les boutons play/pause, barre de progression et durée :
```tsx
// Player custom minimaliste
// - Bouton Play/Pause en rouge #dc2626
// - Barre de progression : track #1f1f1f, fill #dc2626
// - Temps écoulé / durée totale en gris
// - Nom du morceau : "HYMNE OFFICIEL — DONJON ROUGE" en uppercase
```

### SECTION 3 — Affiche Recrutement
```
Titre section : "NOUS RECRUTONS" uppercase tracking-widest rouge

Card recrutement recréée en HTML/CSS (PAS l'image directement) :

Container : bg #111111, border 2px solid #dc2626,
            box-shadow: 0 0 40px rgba(220,38,38,0.2)
            rounded-xl, padding xl

Titre :
  "DONJON ROUGE" — "DONJON" en #f0f0f0 bold, "ROUGE" en #dc2626 bold
  "RECRUTE" — en #f0f0f0 bold, text-3xl uppercase
  Ligne décorative rouge sous le titre

Critères (liste) :
  🏰 HDV 15 MINIMUM     → text #dc2626, font-bold, text-lg
  ✅ ASSIDUITÉ          → text #f0f0f0
  ✅ ENVIE DE PROGRESSER → text #f0f0f0
  ⚠️ RESPECTE LES CONSIGNES → text #f97316 (orange)

Slogan :
  "Viens, combat et conquéris !"
  → italic, text #f59e0b (doré), text-xl, text-center

Bouton :
  "REJOINDRE LE CLAN — DISCORD"
  → bg #dc2626, text white, uppercase, bold, rounded
  → lien : https://discord.gg/CXZcs4umFP
  → hover bg #b91c1c
```

### SECTION 4 — Règles du clan (accordéon)

Titre section : "RÈGLEMENT OFFICIEL" uppercase tracking-widest

Chaque section est un accordéon déroulant (ouvert/fermé au clic).
Chevron qui tourne à l'ouverture. Transition smooth.

Style accordéon :
```
Header fermé : bg #111111, border 1px solid #1f1f1f
Header ouvert : bg #111111, border-left 3px solid #dc2626
Contenu : bg #0f0f0f, padding, border-left 3px solid #1f1f1f
```

#### Accordéon 1 — 📋 RÈGLEMENT GÉNÉRAL
Contenu :
```
🔴 LE RESPECT — obligatoire
Interdit : messages diffamatoires, abusifs, vulgaires, haineux,
harcelant, obscènes, racistes, menaçant la vie privée.
Sinon : exclusion immédiate.

⚠️ IMPORTANT
• 7 jours d'inactivité sans prévenir = exclusion
• 4 héros disponibles obligatoires pour les attaques
```

#### Accordéon 2 — ⚔️ GUERRES DE CLANS (GDC)
Contenu :
```
📅 Lancement le mardi soir à 20h
Sur demande d'un membre pour d'autres GDC :
• Inscription sur le tchat COC 24h à 48h avant
• Demande sur Discord (voir Forum)

LES 2 ATTAQUES SONT OBLIGATOIRES
• 1ère attaque : miroir OBLIGATOIRE
• 2ème attaque : voir consignes Discord

🟨 1ère attaque non faite = carton jaune pour la prochaine GDC
🟨 Non-respect du règlement = carton jaune
🟥 2ème attaque non faite = exclu des GDC 1 mois
```

#### Accordéon 3 — 🏆 LIGUE DE GUERRE (LDC)
Contenu :
```
• Inscription sur Discord
• 2 GDC de qualification requises
• Miroir OBLIGATOIRE tout au long de la LDC

🟨 1 attaque non faite = remplacement immédiat
   + carton jaune + perte des médailles supp
🟨 Non-respect du miroir = pas de bonus
🟥 2 attaques non faites = expulsion du clan

Système d'étoiles mis en place pour rester en LDC.
Voir sur le Discord.
```

#### Accordéon 4 — 🎮 JEUX DE CLANS (JDC)
Contenu :
```
🥇 10 000 pts = Challenge de champion
✅ 5 000 pts = Minimum demandé pour être actif
⚠️ Moins de 5 000 pts = Votre place est en péril
```

#### Accordéon 5 — 💎 RAIDS CAPITAL
Contenu :
```
• Tout raid commencé sur un village doit être fini
  (sauf si plus d'attaques possible)
• Faire ses raids → grade Aîné pour 7 jours ✅
• Ne pas les faire → votre place est en péril ⚠️
```

#### Accordéon 6 — 🎖️ GRADES
Contenu :
```
👑 Chef Adjoint — Suivant les besoins du clan
⭐ Aîné — Attribué via les Raids (voir section Raids)

En acceptant ce règlement, tu confirmes avoir pris
connaissance du fonctionnement du clan. 😀
```

### SECTION 5 — Cartons (tableau visuel)
Titre : "SYSTÈME DE CARTONS" uppercase

Deux colonnes côte à côte :

**Colonne LDC** :
```
bg #111111, border-top 3px solid #f59e0b (or = LDC)

🟨 CARTON JAUNE :
• 1 attaque non faite → remplacement + carton LDC suivante + perte médailles
• Non-respect du règlement → carton LDC suivante

🟥 CARTON ROUGE :
• 2ème attaque non faite → EXPULSION DU CLAN
```

**Colonne GDC** :
```
bg #111111, border-top 3px solid #dc2626 (rouge = GDC)

🟨 CARTON JAUNE :
• 1ère attaque non faite → carton GDC suivante
• Non-respect du règlement → carton GDC suivante

🟥 CARTON ROUGE :
• 2ème attaque non faite → Exclu des GDC 1 mois
```

Les badges carton :
```
🟨 = span bg-yellow-500, text-black, font-bold, px-2 py-1, rounded, text-sm
🟥 = span bg-red-600, text-white, font-bold, px-2 py-1, rounded, text-sm
```

### SECTION 6 — Logos & Médias
Titre : "IDENTITÉ VISUELLE" uppercase

Deux cards côte à côte :
- Logo dragon (logo.png) — avec caption "LOGO OFFICIEL"
- Affiche recrutement (recru.png) — avec caption "AFFICHE DE RECRUTEMENT"
  + bouton "Télécharger" en dessous

---

## STYLE GLOBAL DE LA PAGE

Cohérent avec le reste du site :
- Background : #0d0d0d
- Cards : #111111, border #1f1f1f
- Accent : #dc2626
- Texte : #f0f0f0
- Secondaire : #666
- Titres sections : uppercase, letter-spacing 0.1em, text-xs, color #666
- Séparateurs : border-bottom 1px solid #1a1a1a
- Hover cards : border #dc2626, glow rouge subtil
- Transitions : all 0.2s ease

---

## CHECKLIST
- [ ] /public/images/logo.png copié
- [ ] /public/images/recru.png copié
- [ ] /public/audio/hymne.mp3 copié
- [ ] Favicon remplacé par le logo
- [ ] Logo dans la navbar (remplace le texte)
- [ ] "VITRINE" ajouté dans la navbar
- [ ] Page /vitrine créée avec les 6 sections
- [ ] Player audio custom fonctionnel
- [ ] Accordéons fonctionnels avec transition
- [ ] Cartons jaune/rouge visuels
- [ ] npm run build sans erreur
