# Auto-suppression des membres partis (Discord + CoC) — délai 48h
## Site web Donjon Rouge (backend + frontend superadmin)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Procéder en 2 PHASES OBLIGATOIRES (ne pas fusionner)
- Ne rien casser dans le système existant de gestion des membres (syncMembers.js, panel superadmin)

---

## Contexte
Actuellement, quand un membre quitte le clan CoC (en jeu) ET/OU quitte le serveur Discord, il reste visible dans la liste des membres du panel superadmin. Alan doit le supprimer manuellement.

## Objectif
Le membre doit être automatiquement retiré de la liste des membres du panel superadmin, mais avec un **délai de sécurité de 48h** après le départ détecté (Discord OU clan CoC), plutôt qu'une suppression immédiate — pour éviter de perdre la trace d'un départ accidentel ou temporaire.

---

## PHASE 1 — INVESTIGATION UNIQUEMENT (ne rien coder)

1. Comment la liste des membres du panel superadmin est-elle alimentée actuellement ? (table Supabase, sync CoC via syncMembers.js, jointure avec discord_links ?)
2. Comment un départ CoC (clan) est-il détecté aujourd'hui, si c'est déjà le cas (comparaison de roster à chaque sync ?) ou pas du tout ?
3. Comment un départ Discord est-il détecté (guildMemberRemove.js côté bot — déjà existant) et est-ce que cette info remonte déjà quelque part d'accessible au site/backend (table discord_member_events) ?
4. Propose une structure pour implémenter le délai de 48h : probablement un champ "left_at" (timestamp) rempli dès qu'un départ (Discord ou CoC) est détecté, puis un filtre dans la requête qui alimente le panel superadmin excluant les membres dont left_at date de plus de 48h, OU une tâche planifiée qui supprime réellement la ligne après 48h. Recommande l'approche la plus cohérente avec l'existant.
5. Si un membre revient (re-rejoint le clan ou le Discord) avant les 48h, le champ "left_at" doit être remis à null pour annuler la suppression prévue — confirme que c'est bien pris en compte dans ta proposition.

**Résultat attendu** : rapport clair sur ces 5 points, proposition concrète pour la Phase 2. Ne rien coder, attendre validation d'Alan.

---

## PHASE 2 — IMPLÉMENTATION
À définir une fois le rapport de Phase 1 reçu et validé.

---

## Récap attendu de Claude Code (fin Phase 1)
Réponses aux 5 points, proposition de structure de données et de logique, fichiers concernés identifiés.
