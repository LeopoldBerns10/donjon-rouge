# Widget "Membres connectés Discord" sur le site
## Site web Donjon Rouge (frontend + backend + bot)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Procéder en 2 PHASES OBLIGATOIRES (ne pas fusionner)
- Ne rien casser dans l'existant (bot, backend, site)

---

## Objectif
Afficher sur le site un petit visuel montrant les membres actuellement **connectés/en ligne sur Discord** (uniquement les membres en ligne, pas les hors ligne, pas de liste complète).

## Contrainte technique à examiner
Le site (backend Node.js classique) n'a normalement pas de connexion permanente à Discord — seul le **bot** a accès aux statuts de présence (online/offline/idle) via le Gateway Discord (intents de présence). Il faut donc un pont entre le bot et le site pour transmettre cette info.

---

## PHASE 1 — INVESTIGATION UNIQUEMENT (ne rien coder)

1. Vérifie si le bot a déjà l'intent `GatewayIntentBits.GuildPresences` activé (nécessaire pour lire le statut en ligne/hors ligne des membres) — si non, il faudra l'activer, et vérifier si cet intent est déjà approuvé sur le Discord Developer Portal (intent privilégié, peut nécessiter une validation Discord si le bot est dans beaucoup de serveurs, mais sans impact pour un bot dans un seul serveur comme celui-ci)

2. Propose la meilleure méthode de transmission de cette info du bot vers le site, en comparant au moins 2 options :
   - **Option A** : le bot écrit périodiquement (ex: toutes les 1-2 minutes, ou à chaque changement de présence détecté) la liste des membres en ligne dans une table Supabase (ex: `online_members`), et le site lit simplement cette table via le backend existant — pas besoin de connexion temps réel supplémentaire
   - **Option B** : un endpoint API exposé par le bot lui-même (si le bot expose déjà un serveur HTTP, à vérifier) que le backend du site interroge à la demande
   
   Recommande l'option la plus simple et cohérente avec l'infra actuelle (probablement l'option A, car le bot écrit déjà régulièrement en base pour d'autres features).

3. Précise à quelle fréquence il est raisonnable de mettre à jour cette info (éviter de spammer Supabase à chaque changement de statut d'un membre, un intervalle de 1-2 minutes est probablement suffisant) et si un simple filtre "uniquement les membres avec le rôle Donjon Rouge (ID 611125112519000064)" doit s'appliquer pour ne pas afficher les visiteurs.

4. Propose l'emplacement le plus pertinent sur le site pour ce widget (page d'accueil vitrine ? Une sidebar ? à l'appréciation, propose une suggestion).

**Résultat attendu** : rapport clair sur ces 4 points avec une recommandation technique précise. Ne rien coder, attendre la validation d'Alan avant la Phase 2.

---

## PHASE 2 — IMPLÉMENTATION
À définir une fois le rapport de Phase 1 reçu et validé par Alan.

---

## Récap attendu de Claude Code (fin Phase 1)
Réponses aux 4 points, recommandation technique claire, fichiers/composants concernés identifiés pour la Phase 2.
