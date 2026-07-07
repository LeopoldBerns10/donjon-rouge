# Ajout d'un système "Remplaçants" dans le bloc d'inscription GDC/LDC
## Site web Donjon Rouge (frontend React + backend Node.js)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Ne rien casser dans le système d'inscription existant (paliers, statuts CONFIRMÉ/EN ATTENTE, inscription manuelle par un joueur, clôture des inscriptions, envoi Discord)
- Inspecter l'existant en profondeur avant tout code — c'est une feature à greffer sur un système déjà élaboré, pas à réécrire
- Procéder en 2 PHASES OBLIGATOIRES (ne pas fusionner)

---

## Contexte (voir capture d'écran fournie par Alan)

Le bloc d'inscription GDC/LDC actuel affiche :
- Un événement (ex: "GDC DE SELECTION LDC DE AOUT DR1 ET DR2") avec dates, description
- Un compteur d'inscrits + un système de "paliers" (ex: "PALIER 10 ATTEINT", "4 avant palier 15")
- Un bouton "Inscrit" pour qu'un membre s'inscrive lui-même
- Une liste "JOUEURS INSCRITS" numérotée, avec pour chaque joueur : rang, avatar/rôle, clan (DR1/DR2), pseudo, statut (✓ CONFIRMÉ / EN ATTENTE), grade (Membre/Ancien), date d'inscription, bouton de suppression (✕)
- Un bouton admin "INSCRIRE UN JOUEUR" (inscription manuelle par CyberAlf/staff)
- Boutons de gestion événement : "CLÔTURER INSCRIPTIONS", "TERMINER L'ÉVÉNEMENT", "MODIFIER", "ENVOYER SUR DISCORD"

## Objectif

Ajouter une **nouvelle section "Remplaçants"**, séparée de la liste principale des inscrits, où :
1. Un membre peut s'inscrire lui-même comme **remplaçant** (plutôt que titulaire) — bouton dédié, distinct du bouton "Inscrit" classique
2. Le staff peut aussi inscrire manuellement un joueur comme remplaçant (équivalent du bouton "INSCRIRE UN JOUEUR" mais pour la liste des remplaçants)
3. La liste des remplaçants s'affiche séparément de la liste des inscrits titulaires, dans le même bloc événement

**Ne pas modifier** le fonctionnement des paliers, du statut CONFIRMÉ/EN ATTENTE, ni de la liste principale des titulaires — la section Remplaçants vient s'ajouter à côté, sans interférer.

---

## PHASE 1 — INVESTIGATION UNIQUEMENT (ne rien coder, ne rien modifier)

Claude Code doit explorer et documenter avant toute implémentation :

1. **Structure des données** : quelle(s) table(s) Supabase stockent les inscriptions GDC/LDC actuelles ? Quels champs existent (statut, palier, ordre, event_id, discord_id/coc_name, etc.) ?

2. **Composants frontend concernés** : quel(s) fichier(s) React affichent ce bloc (la carte événement, la liste des joueurs inscrits, le bouton "Inscrit", le bouton admin "INSCRIRE UN JOUEUR") ?

3. **Logique des paliers** : comment le système de palier (10, 15, etc.) est calculé et affiché — est-ce basé uniquement sur le nombre d'inscrits titulaires, ou faudrait-il que les remplaçants comptent différemment (probablement non, à confirmer) ?

4. **Logique CONFIRMÉ / EN ATTENTE** : comment un joueur passe de "EN ATTENTE" à "CONFIRMÉ" (palier atteint ?) — est-ce pertinent pour les remplaçants, ou les remplaçants n'ont-ils pas ce statut du tout (probablement pas de notion de confirmé/en attente pour un remplaçant, à confirmer avec Alan une fois investigué) ?

5. **Inscription manuelle existante** : comment fonctionne exactement le bouton "INSCRIRE UN JOUEUR" côté code (quel endpoint, quel composant, quelles permissions) ? La feature remplaçant manuelle devra suivre le même pattern.

6. **Auto-inscription existante** : comment fonctionne le bouton "Inscrit" côté code (quel endpoint, quelle logique) ? La feature d'auto-inscription en tant que remplaçant devra suivre un pattern similaire.

**Résultat attendu de la Phase 1** : un rapport clair sur ces 6 points, avec les fichiers concernés et des propositions concrètes pour la Phase 2 (structure de données à ajouter — nouvelle colonne "role" titulaire/remplaçant dans la table existante, ou nouvelle table séparée — à l'appréciation de Claude Code selon ce qui est le plus cohérent avec l'existant). Claude Code doit s'arrêter ici et attendre la validation d'Alan avant de coder quoi que ce soit.

---

## PHASE 2 — IMPLÉMENTATION (seulement après validation du rapport de Phase 1)

À définir précisément une fois le rapport de Phase 1 reçu et discuté avec Alan — ne pas anticiper de détails d'implémentation avant d'avoir la structure exacte de l'existant.

---

## Récap attendu de Claude Code (fin de Phase 1)
- Réponses aux 6 points d'investigation
- Fichiers et tables concernés
- Proposition(s) concrète(s) pour la structure de données et les composants de la Phase 2
- Attente explicite de la validation d'Alan avant de continuer
