# Lot 3 — Historique LDC/GDC + Performance par membre

## Objectif

Implémenter deux features sur le site web :
1. Historique des LDC/GDC passées avec résultats
2. Système de performance par membre (taux de participation)

## Contraintes

- Ne rien casser dans ce qui existe déjà sur le site
- S'appuyer sur les tables existantes : `war_events`, `war_signups`, `member_participation` (LOT1)
- Grouper toutes les modifications dans un minimum de fichiers

---

## Feature 1 — Historique LDC/GDC

### Page
Nouvelle page `/historique` sur le site web accessible depuis la navigation

### Accès
Membres connectés (rôle LIE minimum)

### Contenu
Liste des événements passés (war_events avec status = 'ended') triés par date décroissante :

```
⚔️ LDC DR1 — Juin 2026
📅 02/06/2026 → 10/06/2026
👥 15 participants
✅ Terminée

[Voir les participants]
```

Au clic sur "Voir les participants" → affiche la liste des inscrits pour cet événement depuis `war_signups`.

### Logique backend
- GET `/api/war-events/history` — retourne les événements avec status 'ended', triés par date DESC, avec count des inscrits
- GET `/api/war-events/:id/signups` — retourne la liste des inscrits pour un événement

---

## Feature 2 — Performance par membre

### Page
Nouvelle section dans le profil membre ou page `/performance` accessible depuis la navigation

### Accès
Membres connectés (rôle LIE minimum)

### Contenu
Pour chaque membre lié CoC :

```
🎯 PERFORMANCE — CyberAlf

GDC :
• Guerres jouées : 20
• Taux de participation : 95%
• % moyen des attaques : 87%
• Double perfs : 8

JDC :
• Sessions jouées : 3
• Taux de participation : 100%

Global :
• Score d'activité : 97/100
```

### Logique
- Appeler `getParticipationRate()` depuis `participationStats.js` via une route backend
- GET `/api/members/:discord_id/performance` — retourne les stats de participation
- Afficher les données sur le profil du membre

---

## Fichiers à créer/modifier

### Backend
| Fichier | Action |
|---------|--------|
| `backend/src/routes/warEvents.js` | Ajouter GET /history et GET /:id/signups |
| `backend/src/controllers/warEventsController.js` | Ajouter getHistory et getSignups |
| `backend/src/routes/members.js` | Ajouter GET /:discord_id/performance |

### Frontend
| Fichier | Action |
|---------|--------|
| `frontend/src/pages/Historique.jsx` | Nouvelle page historique |
| `frontend/src/pages/Performance.jsx` | Nouvelle page performance |
| `frontend/src/App.jsx` | Ajouter routes /historique et /performance |
| `frontend/src/components/Nav.jsx` | Ajouter liens navigation |

---

## Étape 0 obligatoire

Avant de coder, lire :
- `backend/src/routes/warEvents.js` (routes existantes)
- `frontend/src/pages/Inscriptions.jsx` (pattern existant)
- `frontend/src/App.jsx` (routing existant)
- `frontend/src/components/Nav.jsx` (navigation existante)
- Structure de la table `war_events` et `war_signups`

