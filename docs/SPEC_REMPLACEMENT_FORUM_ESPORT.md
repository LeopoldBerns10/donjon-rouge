# SPEC — Suppression page Forum (+ tchat live) + remplacement par E-Sport dans le menu
## Site web Donjon Rouge (frontend React + backend Node.js)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter l'existant avant toute modification (structure des routes, du menu, et de la page /esport actuelle)
- Ne pas toucher aux autres pages/fonctionnalités du site (inscriptions LDC/GDC, historique, roulette, profil membre, etc.)
- Ne rien casser dans le menu de la page d'accueil en dehors de l'entrée concernée
- Si la page /esport a déjà un bug 404 identifié, l'investiguer et le corriger dans le cadre de cette tâche (déjà noté comme point en attente du projet)
- **IMPORTANT — Le tchat live de la page forum doit aussi être supprimé (il sera refait différemment plus tard, hors scope ici). Procéder en 2 PHASES OBLIGATOIRES (ne pas fusionner ces étapes) :**

### PHASE 1 — SCAN UNIQUEMENT (ne rien supprimer/modifier à ce stade)
Faire l'inventaire complet de tout ce qui est lié à la page `/forum` ET au tchat live, avant toute suppression :
- Tous les fichiers frontend concernés (page forum, composants de tchat, hooks, styles)
- Tous les fichiers backend concernés (routes API, contrôleurs, sockets)
- Le mécanisme temps réel utilisé pour le tchat (Socket.io ou autre) : est-ce une instance/namespace dédiée au tchat, ou est-ce PARTAGÉ avec Socket.io du dashboard (notifications temps réel déjà existantes) ? C'est le point le plus critique à vérifier avant de toucher quoi que ce soit, pour ne pas casser les notifications du dashboard.
- Toute table Supabase liée au tchat (messages, historique, utilisateurs connectés, etc.)
- Toute dépendance npm utilisée uniquement pour le tchat (à ne retirer que si elle n'est utilisée nulle part ailleurs)
- Tout événement Socket.io (nom des events émis/écoutés) lié au tchat, en vérifiant qu'aucun nom d'event n'est réutilisé ailleurs dans le projet

**Résultat attendu de la Phase 1 : un rapport listant précisément chaque fichier, route, table, dépendance et event concerné, avec pour chacun une indication claire "spécifique au tchat/forum" ou "partagé avec autre chose (à ne PAS supprimer)". Ce rapport doit être présenté à Alan AVANT de passer à la Phase 2.**

### PHASE 2 — SUPPRESSION (seulement après validation du rapport de Phase 1)
Une fois le rapport de Phase 1 confirmé par Alan, supprimer uniquement les éléments identifiés comme spécifiques au forum/tchat, et procéder au reste de la spec (menu, page /esport).

---

## Objectif

1. Supprimer complètement la page/route `/forum` (elle n'existe plus, ni son contenu, ni sa route)
2. Supprimer complètement le tchat live associé à la page forum (frontend + backend + éventuelle table Supabase dédiée) — sera refait différemment plus tard, ne pas essayer de le remplacer maintenant
3. Renommer l'entrée de menu "Forum" en "E-Sport" sur la page d'accueil (et partout où ce lien de menu apparaît, ex: header/navbar) — ce lien pointe désormais vers `/esport`
4. Corriger le bug 404 existant sur la page `/esport` (warlog clan #2CLY9L0LY) pour qu'elle soit pleinement fonctionnelle une fois mise en avant dans le menu principal

---

## Détails techniques à vérifier par Claude Code

### Suppression de /forum
- Localiser le composant de route `/forum` (probablement dans le routeur React, ex: `App.jsx`, `routes.jsx` ou équivalent)
- Supprimer la route et le composant associé (fichier de page Forum) — vérifier qu'aucun autre composant ne l'importe avant de supprimer le fichier physique
- Vérifier qu'aucune API backend n'est utilisée exclusivement par le forum ; si c'est le cas, l'évaluer avant suppression (ne pas supprimer une API encore utilisée ailleurs)

### Renommage menu
- Trouver le composant de navigation/menu (navbar, header, ou liste de liens raccourcis en page d'accueil)
- Remplacer le libellé "Forum" par "E-Sport"
- Remplacer le lien associé de `/forum` vers `/esport`
- Vérifier s'il y a plusieurs endroits où ce lien apparaît (menu desktop + mobile, footer, page d'accueil) et les mettre à jour tous

### Bug 404 sur /esport
- Investiguer la cause : route mal définie, composant qui plante au chargement, appel API vers le backend qui échoue (ex: mauvais endpoint pour récupérer le warlog du clan E-Sport #2CLY9L0LY), problème de build/déploiement Render, etc.
- Corriger la cause racine
- Vérifier que la page affiche bien les informations attendues (résultats warlog, activation/désactivation par CyberAlf uniquement, comme déjà en place selon le reste du projet)

---

## Vérifications finales attendues
- La route `/forum` renvoie une 404 propre (ou redirige vers l'accueil, à choisir selon la convention déjà utilisée ailleurs sur le site pour les routes supprimées)
- Le lien "E-Sport" dans le menu fonctionne et mène bien vers une page `/esport` qui s'affiche correctement (plus de bug 404)
- Aucune autre page du site n'est impactée

---

## Récap attendu de Claude Code

**D'abord (fin de Phase 1) :** le rapport d'inventaire complet (fichiers/routes/tables/dépendances/events liés au forum et au tchat, avec mention "spécifique" ou "partagé — à ne pas toucher"). Claude Code doit s'arrêter ici et attendre la confirmation d'Alan avant de supprimer quoi que ce soit.

**Ensuite (fin de Phase 2, après validation) :**
- Fichiers supprimés (page forum, tchat live, éventuelles routes/API/tables désormais inutilisées)
- Fichiers modifiés (menu/navbar, routeur, cause du bug 404 corrigée)
- Description précise de la cause du bug 404 et du fix appliqué
- Confirmation que le menu affiche bien "E-Sport" partout où c'était "Forum"
- Confirmation explicite que le Socket.io du dashboard (notifications temps réel) n'a pas été impacté
