# Refonte permissions Discord — Donjon Rouge
## Bot Donjon Rouge

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Ne rien casser dans les overrides existants des salons privés YouTube (📺-suivi-*) — ne pas toucher à ces salons
- Ne pas toucher aux permissions du bot lui-même (Donjon-Rouge-Bot)
- Appliquer les permissions PAR CATÉGORIE d'abord, puis les overrides par salon si nécessaire
- Faire un backup des permissions actuelles avant toute modification (noter les overrides existants)
- Guild ID : 610767309031866371

---

## IDs de référence

### Rôles
- Chef : 611123759864348672
- Chef Adjoint : 1297318759396278425
- Recruteur : 1421254471391907840
- Codeur : 1434575482182963310 (à vérifier dans l'audit)
- Donjon Rouge : 611125112519000064
- Lié : 1511096527664320655
- Partenaire : 1451230853664608399
- Visiteur : 1072532916955009095
- Vérifié : 1511080481108660326
- Non vérifié : 1350801589652422728
- @everyone : 610767309031866371

### Catégories
- Intégration : 1511081858723610684
- Infos Clash & Clan : 1443233659216855110
- Clan Donjon Rouge : 610767309488914443
- Forum : 1335372304288579654
- Guerre : 768548839203274772
- Vocaux : 1512087080594051102
- Quartier des Généraux : 678344448781975554
- BOT : 1510926918541639730
- SUIVIS YOUTUBE : 1523310822003314770

### Salons spécifiques
- 1-vérification : 1511079948956340355
- 2-lis-le-règlement : 1511079308125536386
- 3-mon-compte (lier CoC) : 1510987282344317040
- flood : 1503680775462064168
- flood-war : 1481240766712905839
- anniversaires : 1520034360559013939
- sondages : 1520034566532759633
- suivi-créateurs : 1523308024687493161
- tickets : 1446604754045239417
- log-bot : 1522722935918559364
- cyberalf (panel secret) : 1522353459364626625
- sauron : 1512087471373029508
- forum-du-clan : 1279055712089149440

---

## Structure des permissions à appliquer

### @everyone (base pour tout le monde)
- ViewChannel : ❌ (par défaut, personne ne voit rien sauf exceptions)
- SendMessages : ❌
- Connect : ❌

---

### Non vérifié (1350801589652422728)
Peut voir UNIQUEMENT :
- Salon 1-vérification (1511079948956340355) : ViewChannel ✅, SendMessages ✅
- Salon 2-lis-le-règlement (1511079308125536386) : ViewChannel ✅, SendMessages ❌ (lecture seule)
- Salon tickets (1446604754045239417) : ViewChannel ✅, SendMessages ✅
Tout le reste : ❌

---

### Visiteur (1072532916955009095)
Peut voir UNIQUEMENT :
- Salon flood (1503680775462064168) : ViewChannel ✅, SendMessages ✅
- Salon 2-lis-le-règlement (1511079308125536386) : ViewChannel ✅, SendMessages ❌
- Salon tickets (1446604754045239417) : ViewChannel ✅, SendMessages ✅
Tout le reste : ❌

---

### Donjon Rouge (611125112519000064)
En plus du Visiteur, peut voir :
- Salon 3-mon-compte/lier CoC (1510987282344317040) : ViewChannel ✅, SendMessages ✅
- Catégorie Infos Clash & Clan (1443233659216855110) : ViewChannel ✅, SendMessages ❌ (lecture seule), AddReactions ❌
- Catégorie Clan Donjon Rouge (610767309488914443) : ViewChannel ✅, SendMessages ❌ (lecture seule), AddReactions ❌
- Salon forum-du-clan (1279055712089149440) : ViewChannel ✅, SendMessages ❌ (lecture seule)
Tout le reste : ❌

---

### Lié (1511096527664320655)
En plus de Donjon Rouge, peut :
- Salon forum-du-clan (1279055712089149440) : SendMessages ✅ (écriture)
- Salon anniversaires (1520034360559013939) : AddReactions ✅
- Salon sondages (1520034566532759633) : AddReactions ✅
- Salon suivi-créateurs (1523308024687493161) : AddReactions ✅
- Catégorie Guerre (768548839203274772) : ViewChannel ✅, SendMessages ❌ (lecture seule)
  - Override salon flood-war (1481240766712905839) : SendMessages ✅ (écriture uniquement dans ce salon)
- Catégorie Vocaux (1512087080594051102) : ViewChannel ✅, Connect ✅, Speak ✅, Stream ✅, UseVAD ✅

---

### Chef Adjoint (1297318759396278425)
En plus de Lié, peut :
- Catégorie Quartier des Généraux (678344448781975554) : ViewChannel ✅, SendMessages ✅
- Modération messages dans TOUS les salons visibles : ManageMessages ✅, ManageThreads ✅
- Catégorie Guerre : SendMessages ✅ dans TOUS les salons (pas juste flood-war)
- Salon sauron (1512087471373029508) : ViewChannel ✅, SendMessages ✅
Catégorie BOT : ❌ (pas d'accès)
Salons cyberalf + log-bot : ❌

---

### Recruteur (1421254471391907840)
Mêmes droits que Lié +
- Catégorie Quartier des Généraux (678344448781975554) : ViewChannel ✅, SendMessages ✅

---

### Codeur (1434575482182963310)
Accès UNIQUEMENT à :
- Catégorie BOT (1510926918541639730) : ViewChannel ✅, SendMessages ✅
  - SAUF salon cyberalf (1522353459364626625) : ❌
  - SAUF salon log-bot (1522722935918559364) : ❌

---

### Chef (611123759864348672)
Accès total à tout + :
- Salon cyberalf (1522353459364626625) : ViewChannel ✅ (lui uniquement)
- Salon log-bot (1522722935918559364) : ViewChannel ✅ (lui uniquement)
- Catégorie BOT : ViewChannel ✅, SendMessages ✅

---

## Salons à NE PAS TOUCHER
- Catégorie SUIVIS YOUTUBE et tous les salons 📺-suivi-* : permissions déjà gérées par le bot YouTube, ne pas modifier
- Overrides personnels du bot Donjon-Rouge-Bot : ne pas modifier

---

## Ordre d'application recommandé
1. Réinitialiser les permissions de chaque catégorie (partir d'une base propre)
2. Appliquer les permissions par rôle sur chaque catégorie
3. Appliquer les overrides par salon (flood-war, cyberalf, log-bot, etc.)
4. Vérifier en simulant chaque rôle que les accès sont corrects

---

## Récap attendu de Claude Code
- Liste des catégories et salons modifiés
- Confirmation que les salons YouTube et overrides bot n'ont pas été touchés
- Confirmation de chaque rôle avec ce qu'il peut voir/faire
- Signalement de tout conflit ou ambiguïté trouvé pendant l'application
