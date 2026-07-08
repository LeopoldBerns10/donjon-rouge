# Tracker les LDC dans member_participation
## Bot Donjon Rouge

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter scheduler.js (bloc isLdc, ligne ~400) et participationStats.js avant modification
- Ne rien casser dans le tracking GDC existant (recordGdcParticipation)

---

## Contexte
Actuellement, dans scheduler.js, quand `isLdc && cwl?.season` est vrai, seul `postExploit(...)` est appelé — `recordGdcParticipation` est skip pour les rounds LDC. Résultat : aucune donnée LDC n'est jamais enregistrée dans `member_participation`.

## Objectif
Enregistrer aussi la participation LDC, avec un `event_type = 'ldc'` distinct de `'gdc'` (pour ne pas fausser les stats GDC classiques), quand un round LDC se termine (`war.state === 'warEnded'`).

## À faire
1. Ajoute l'appel équivalent à `recordGdcParticipation` (même logique : participation, attack_percentage, double_perf) mais avec `event_type = 'ldc'`, dans la branche `isLdc` du scheduler, déclenché quand le round LDC se termine
2. Vérifie que `participationStats.js` gère bien ce nouveau `event_type` sans dupliquer l'enregistrement à chaque tick (même protection anti-doublon que pour les GDC classiques)
3. Dans le panel superadmin (PerformancePanel/DetailModal déjà créés), ajoute une colonne/section LDC distincte de GDC (taux, historique) — même pattern que GDC/JDC actuels

## Récap attendu
Fichiers modifiés, confirmation que le GDC classique n'est pas impacté, confirmation qu'un round LDC déjà terminé ne sera pas rattrapé rétroactivement (seuls les futurs rounds seront trackés, sauf si un rattrapage simple est possible sans risque).
