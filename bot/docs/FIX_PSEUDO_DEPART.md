# Fix embed de départ — afficher le pseudo au lieu de l'ID Discord
## Bot Donjon Rouge

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter guildMemberRemove.js avant modification
- Ne rien casser dans le reste de la logique de départ (insert discord_member_events, suppression discord_links, log Logs bot)

---

## Bug
L'embed de départ d'un membre (guildMemberRemove.js) affiche l'ID Discord brut au lieu du pseudo/nickname que le membre avait sur le serveur.

## Fix attendu
Utiliser le nickname serveur du membre (`member.nickname` ou `member.displayName`, avec fallback sur `member.user.username` si aucun surnom n'était défini) au lieu de l'ID brut dans l'embed de départ. Vérifier que `member` (l'objet Discord.js reçu par l'event `guildMemberRemove`) contient encore ces infos au moment du départ (généralement oui, car Discord.js fournit l'état du membre juste avant son départ effectif du cache).

Si `member.nickname`/`displayName` n'est pas disponible pour une raison quelconque (cache vide), fallback sur `member.user.username`, et en dernier recours seulement, l'ID.

## Récap attendu
Fichier modifié, confirmation que le reste du comportement (historique, discord_links, log) n'est pas impacté.
