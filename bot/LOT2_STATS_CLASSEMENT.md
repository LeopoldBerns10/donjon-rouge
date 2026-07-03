# Lot 2 — Stats hebdomadaires + Classement membres

## Objectif

Implémenter deux features bot Discord qui utilisent la fondation LOT1 :
1. Stats hebdomadaires automatiques postées chaque lundi
2. Classement des membres les plus actifs via commande slash

## Contraintes

- Ne rien casser dans ce qui existe déjà
- S'appuyer sur `participationStats.js` créé en LOT1
- Grouper toutes les modifications dans un minimum de fichiers

---

## Feature 1 — Stats hebdomadaires (chaque lundi 10h Paris)

### Salon de destination
Salon annonces : `1441176254769401969`

### Déclencheur
Dans `src/scheduler.js`, si `parisHour === 10 && parisDay === 1` (lundi) — anti-doublon avec clé `weekly_stats_YYYY-MM-DD` dans `bot_config`.

### Contenu de l'embed
```
📊 STATS DE LA SEMAINE — Donjon Rouge

⚔️ Guerres (GDC)
• Guerres jouées : X
• Taux de participation moyen : X%
• Meilleur performeur : @membre (X% moy.)

🎮 Jeux de Clan
• JDC actif ce mois : oui/non
• Membres ayant participé : X/Y
• Taux de participation : X%

💎 Raid Capital
• Attaques utilisées : X/Y
• Membres actifs : X

🏆 Top 3 membres les plus actifs cette semaine
1. @membre — X participations
2. @membre — X participations  
3. @membre — X participations
```

### Logique
- Lire `member_participation` pour la semaine écoulée (7 derniers jours)
- Calculer les stats GDC et JDC
- Pour le Raid : lire les données depuis le backend CoC
- Poster l'embed dans le salon annonces

---

## Feature 2 — Classement membres (/classement)

### Commande slash
`/classement [periode]` — période optionnelle : `semaine`, `mois`, `total` (défaut : `mois`)

### Accès
Rôle LIE (`1511096527664320655`) minimum

### Format de la réponse (embed éphémère)
```
🏆 CLASSEMENT — Donjon Rouge (30 derniers jours)

1. 🥇 @membre — 95% participation (19/20 guerres)
2. 🥈 @membre — 90% participation (18/20 guerres)
3. 🥉 @membre — 85% participation (17/20 guerres)
...
10. @membre — 60% participation (12/20 guerres)

Basé sur GDC + JDC combinés
```

### Logique
- Appeler `getParticipationRate()` pour chaque membre lié (discord_links)
- Trier par taux de participation décroissant
- Afficher les 10 premiers
- Si aucune donnée → message "Pas encore assez de données"

---

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/lib/weeklyStats.js` | Nouveau — logique calcul stats semaine + envoi embed |
| `src/commands/classement.js` | Nouveau — commande slash /classement |
| `src/scheduler.js` | Modifier — ajouter appel weeklyStats si lundi 10h |
| `index.js` | Modifier — charger commande /classement |

---

## Étape 0 obligatoire

Avant de coder, lire :
- `src/lib/participationStats.js` (LOT1)
- `src/scheduler.js` (pour suivre le pattern existant)
- `src/commands/` (pour suivre le pattern des commandes existantes)
- Vérifier que la table `member_participation` existe bien en Supabase

