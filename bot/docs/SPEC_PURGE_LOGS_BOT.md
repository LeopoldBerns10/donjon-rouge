# SPEC — Purge automatique du salon Logs bot
## Bot Donjon Rouge — Nouvelle feature

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter l'existant avant toute modification (comment `botLogger.js` fonctionne actuellement, format des messages de log)
- Ne rien casser dans le système de log existant (la fonction `log()` doit continuer à fonctionner normalement pour tous les appels déjà en place dans le bot)
- Vérifier l'existant avant de créer un nouveau fichier ou une nouvelle fonction (pas de doublon)

---

## Objectif

Le salon Logs bot (ID `1522722935918559364`) grossit indéfiniment et devient illisible. Deux actions à mettre en place :

1. **Nettoyage initial (one-shot)** : purger TOUS les messages actuellement présents dans le salon, depuis le début, une bonne fois pour repartir sur une base propre.

2. **Purge automatique récurrente** (toutes les 24h) :
   - Les logs **normaux** (tout sauf les erreurs) sont supprimés dès qu'ils dépassent **24h**
   - Les logs **d'erreur** (identifiables par le préfixe 🔴 ou le mot "ERREUR" dans le message, cf format existant dans `botLogger.js`) sont conservés plus longtemps : supprimés seulement après **48h**

---

## Détails techniques

### 1. Nettoyage initial (à exécuter une seule fois, pas dans le scheduler)
- Fetch et suppression de tous les messages du salon `1522722935918559364`
- Utiliser `channel.bulkDelete()` pour les messages de moins de 14 jours (limite Discord)
- Pour d'éventuels messages plus vieux que 14 jours (peu probable vu que le salon est récent), les supprimer un par un individuellement (`message.delete()`) si `bulkDelete` les rejette
- Peut être fait via un script autonome dans `bot/src/scripts/` (comme le script de test YouTube), exécutable une seule fois depuis le terminal, plutôt que dans le code du bot en continu

### 2. Purge automatique récurrente (à intégrer dans scheduler.js)
- Nouvelle tâche planifiée toutes les 24h (suivre le pattern déjà utilisé pour les autres tâches du scheduler, ex: `checkLeagueRefresh`)
- Logique :
  - Fetch les messages du salon `1522722935918559364`
  - Pour chaque message, déterminer son type :
    - Si le contenu contient "ERREUR" ou commence par 🔴 → seuil de suppression = 48h (`message.createdTimestamp`)
    - Sinon → seuil de suppression = 24h
  - Supprimer les messages qui dépassent leur seuil respectif
  - Utiliser `bulkDelete()` par lot quand c'est possible (regrouper les IDs à supprimer), sinon suppression individuelle
- Logger dans la console (pas besoin de reloguer dans le salon Logs bot lui-même, ça créerait une boucle) le nombre de messages supprimés à chaque passage, pour debug si besoin

### 3. Vérifier le format des logs existants dans botLogger.js
- Avant d'implémenter la détection "ERREUR" vs "normal", relire `botLogger.js` pour confirmer le format exact utilisé (ex: est-ce que le mot "ERREUR" est toujours présent en majuscules dans les logs d'erreur, comme vu dans les exemples récents : `ERREUR — Refresh ligue — ...`) et adapter la détection en conséquence pour être fiable à 100%

---

## Emplacement des fichiers
- Script de nettoyage initial (one-shot) : `bot/src/scripts/purgeLogsChannel.js`
- Nouvelle fonction de purge récurrente : ajouter dans `bot/src/scheduler.js` (ou un nouveau fichier `bot/src/lib/logsPurger.js` si Claude Code juge que c'est plus propre de séparer, à son appréciation en respectant la structure existante)

---

## Récap attendu de Claude Code
- Confirmation du nettoyage initial exécuté (nombre de messages supprimés)
- Fichiers créés/modifiés pour la purge récurrente
- Confirmation du format de détection ERREUR vs normal utilisé
- Rappel de la commande à lancer pour le nettoyage initial si c'est un script à exécuter manuellement une fois
