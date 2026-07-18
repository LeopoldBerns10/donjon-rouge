# Refonte complète — Embeds guerre, rappels, résultats, panel admin
## Bot Donjon Rouge

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Supprimer PROPREMENT tout le code existant lié aux rappels, embeds de guerre, panel Sauron, commandes associées — repartir de zéro
- Inspecter d'abord les fichiers existants (scheduler.js, warMessages.js, rappelManager.js, panelHandlers.js, commandes existantes) pour identifier tout ce qui doit être supprimé
- Ne rien casser dans les autres features (anniversaires, sondages, route infinie, YouTube, modération, etc.)
- Ne pas modifier cocApi.js ni cocDirectApi.js
- Guild ID : 610767309031866371

---

## IDs de référence

### Salons
- Guerre DR1 : 1511988469918994545
- Guerre DR2 : 1511988535094153286
- JDC + Raids : 1511988581135159376
- Rappels : 1510972919407317142
- Résultats / Exploits : 1516046143887376505
- Panel Sauron (admin) : 1512087471373029508
- Logs bot : 1522722935918559364

### Rôles
- Chef : 611123759864348672
- Chef Adjoint : 1297318759396278425
- Lié : 1511096527664320655
- Donjon Rouge : 611125112519000064

### Clans CoC
- DR1 : #29292QPRC
- DR2 : #2RCGG9YR9

---

## PARTIE 1 — SALONS D'INFOS (embeds état en cours, sans ping)

### Salon Guerre DR1 (1511988469918994545)
2 embeds permanents, indépendants, mis à jour toutes les heures automatiquement et sans ping :

**Embed GDC DR1**
- Titre : "⚔️ Guerre de Clan — DR1"
- Contenu : état de la guerre en cours (preparation/inWar/warEnded/notInWar), adversaire, score DR vs adversaire, temps restant, liste des membres avec statut attaque (✅ 2/2, ⚡ 1/2, ❌ 0/2)
- Si pas de guerre : "Aucune guerre en cours"
- Bouton : "🔄 Actualiser" (customId: refresh_gdc_dr1) — Chef/Adjoint uniquement
- Comportement : supprime l'ancien embed et poste un nouveau à chaque actualisation (auto ou manuelle)

**Embed LDC DR1**
- Titre : "🏆 Ligue des Clans — DR1"
- Contenu : saison LDC en cours, round actuel, adversaire du round, score, temps restant, liste membres avec statut attaque (✅ 1/1, ❌ 0/1)
- Si pas de LDC : "Aucune LDC en cours"
- Bouton : "🔄 Actualiser" (customId: refresh_ldc_dr1) — Chef/Adjoint uniquement
- Même comportement suppression/repost

### Salon Guerre DR2 (1511988535094153286)
Identique mais pour DR2 :
- Embed GDC DR2 (customId bouton: refresh_gdc_dr2)
- Embed LDC DR2 (customId bouton: refresh_ldc_dr2)

### Salon JDC + Raids (1511988581135159376)
2 embeds permanents :

**Embed Raids**
- Titre : "💎 Raid Capital — DR1" (et/ou DR2 si actif)
- Contenu : état (Actif/Inactif), attaques utilisées/total, liste membres avec @mention + pseudo CoC + attaques (❌ 0/5, ⚡ X/5, ✅ 5/5) — style identique au screen fourni
- Bouton : "🔄 Actualiser" (customId: refresh_raids) — Chef/Adjoint uniquement

**Embed JDC**
- Titre : "🎖️ Jeux des Clans"
- Contenu : état (Actif/Inactif), points actuels/objectif, liste membres avec points individuels et statut participation
- Bouton : "🔄 Actualiser" (customId: refresh_jdc) — Chef/Adjoint uniquement

---

## PARTIE 2 — SALON RAPPELS (1510972919407317142)

6 embeds permanents avec ping intégré dans l'embed (pas de message séparé), actualisés automatiquement à 10h et 20h heure Paris.

**Style embed rappel (identique au screen fourni) :**
- Les pings @mention sont dans le contenu de l'embed directement
- Croix ❌ pour non-attaquants/non-participants
- Éclair ⚡ pour partiellement fait
- Check ✅ pour complété
- Footer : "Nom du clan • Type d'événement • Aujourd'hui à HH:MM"

**6 embeds :**
1. Rappel GDC DR1 (customId bouton: rappel_refresh_gdc_dr1)
2. Rappel GDC DR2 (customId bouton: rappel_refresh_gdc_dr2)
3. Rappel LDC DR1 (customId bouton: rappel_refresh_ldc_dr1)
4. Rappel LDC DR2 (customId bouton: rappel_refresh_ldc_dr2)
5. Rappel Raids (customId bouton: rappel_refresh_raids)
6. Rappel JDC (customId bouton: rappel_refresh_jdc)

**Chaque embed :**
- Bouton "🔄 Actualiser" indépendant — Chef/Adjoint uniquement
- Actualisation auto à 10h et 20h Paris — supprime l'ancien et reposte le nouveau
- Le ping des membres Liés (@mention) est dans le contenu de l'embed
- Si l'événement n'est pas actif : embed minimal "Aucun événement en cours"

---

## PARTIE 3 — SALON RÉSULTATS (1516046143887376505)

Résultats postés automatiquement dès la fin de l'événement détectée par le scheduler, ET disponibles manuellement via bouton dans le panel Sauron.

**Résultats GDC (DR1 et DR2 séparément)**
- En-tête : nom du clan, adversaire, score final, victoire/défaite
- Tableau de tous les membres avec : @mention, pseudo CoC, attaque 1 (étoiles + %), attaque 2 (étoiles + %), total
- Section "⚠️ N'ont pas attaqué" : liste des membres avec 0 attaque utilisée

**Résultats LDC (DR1 et DR2 séparément)**
- Même structure mais 1 attaque par membre par round
- Section "⚠️ N'ont pas attaqué" pour ce round

**Résultats Raids**
- En-tête : DR1, total attaques utilisées, capital gold pillé
- Liste membres avec @mention + attaques (X/5)
- Section "⚠️ N'ont pas attaqué" : 0 attaque
- Section "⚠️ Incomplet" : entre 1 et 4 attaques

**Résultats JDC**
- En-tête : points totaux du clan, objectif atteint ou non
- Classement membres par points individuels
- Section "⚠️ N'ont pas participé" : 0 points

---

## PARTIE 4 — PANEL ADMIN SAURON (1512087471373029508)

Refait entièrement. Embed principal avec boutons organisés par lignes de 3 maximum.

**Ligne 1 — Actualiser infos en cours**
- [🔄 GDC DR1] [🔄 GDC DR2] [🔄 LDC DR1]

**Ligne 2**
- [🔄 LDC DR2] [🔄 Raids] [🔄 JDC]

**Ligne 3 — Actualiser rappels**
- [📣 Rappel GDC DR1] [📣 Rappel GDC DR2] [📣 Rappel LDC DR1]

**Ligne 4**
- [📣 Rappel LDC DR2] [📣 Rappel Raids] [📣 Rappel JDC]

**Ligne 5 — Résultats manuels**
- [📊 Résultats GDC DR1] [📊 Résultats GDC DR2] [📊 Résultats LDC DR1]

**Ligne 6**
- [📊 Résultats LDC DR2] [📊 Résultats Raids] [📊 Résultats JDC]

Tous les boutons réservés Chef/Adjoint uniquement.

---

## PARTIE 5 — COMMANDES SLASH

- `/setupguerre` — (re)poste les embeds dans les salons d'infos guerre (Chef uniquement)
- `/setuprappels` — (re)poste les 6 embeds de rappel (Chef uniquement)
- `/setuppanel` — (re)poste le panel Sauron (Chef uniquement)
- `/refreshgdc [dr1|dr2]` — actualise l'embed GDC du clan choisi
- `/refreshldc [dr1|dr2]` — actualise l'embed LDC du clan choisi
- `/refreshraids` — actualise l'embed Raids
- `/refreshjdc` — actualise l'embed JDC
- `/resultats [gdc_dr1|gdc_dr2|ldc_dr1|ldc_dr2|raids|jdc]` — poste manuellement les résultats

---

## PARTIE 6 — SCHEDULER

Tâches automatiques à ajouter dans scheduler.js (proprement, sans toucher aux autres tâches) :

- **Toutes les heures** : actualiser les 6 embeds d'infos (salons guerre + JDC/raids) sans ping
- **À 10h et 20h heure Paris** : actualiser les 6 embeds de rappel avec ping membres Liés
- **Dès détection fin d'événement** : poster automatiquement les résultats dans 1516046143887376505
  - GDC : war.state passe de 'inWar' à 'warEnded'
  - LDC : round LDC passe à 'warEnded'
  - Raids : raid.state passe de 'ongoing' à 'ended'
  - JDC : détection fin de saison JDC

---

## SUPPRESSION DE L'EXISTANT

Avant de coder, supprimer proprement :
- bot/src/lib/rappelManager.js — à supprimer
- bot/src/lib/warMessages.js — à supprimer
- bot/src/lib/weeklyStats.js — vérifier si encore utilisé ailleurs avant de supprimer
- bot/src/lib/participationStats.js — vérifier si encore utilisé ailleurs (member_participation) avant de supprimer
- bot/src/commands/refreshrappel.js — à supprimer
- bot/src/commands/refreshjdc.js — à supprimer
- bot/src/commands/refreshraid.js — à supprimer
- bot/src/commands/classement.js — vérifier si à garder
- Tous les appels à ces modules dans scheduler.js — nettoyer
- Les entrées correspondantes dans bot_config (IDs de messages persistants) — nettoyer via Supabase
- Le panel Sauron existant dans Discord — supprimer le message manuellement ou via script

Claude Code doit lister ce qu'il va supprimer et attendre confirmation avant de supprimer quoi que ce soit.

---

## ARCHITECTURE FICHIERS (nouveaux)

- `bot/src/lib/warEmbeds.js` — construction des embeds (infos en cours)
- `bot/src/lib/rappelEmbeds.js` — construction des embeds rappels avec pings
- `bot/src/lib/resultatsEmbeds.js` — construction des embeds résultats
- `bot/src/lib/eventChannels.js` — gestion des messages persistants (suppression/repost) pour chaque salon
- `bot/src/lib/panelSauron.js` — panel admin Sauron
- `bot/src/commands/setupguerre.js`, `setuprappels.js`, `setuppanel.js`
- `bot/src/commands/refreshgdc.js`, `refreshldc.js`, `refreshraids.js`, `refreshjdc.js`
- `bot/src/commands/resultats.js`

---

## RÉCAP ATTENDU DE CLAUDE CODE

**Phase 1 (investigation + liste suppression) :** lister tous les fichiers/fonctions/clés bot_config à supprimer, avec indication si chaque élément est utilisé ailleurs. ARRÊT obligatoire avant suppression — attendre validation Alan.

**Phase 2 (suppression + implémentation) :** après validation, supprimer l'existant et implémenter tout ce qui est décrit ci-dessus. Récap complet des fichiers créés/modifiés/supprimés.
