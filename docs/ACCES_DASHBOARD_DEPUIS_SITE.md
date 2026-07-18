# Gestion des accès Dashboard depuis le site
## Site web + Dashboard Donjon Rouge

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter l'existant avant tout code (page profil sur le site, système d'auth dashboard OAuth2, table users, système de rôles dashboard existant)
- Ne rien casser dans le système d'auth existant (superadmin, admin, OAuth2 Discord)
- Procéder en 2 phases : investigation (Phase 1) puis implémentation (Phase 2)

---

## Objectif

1. **Lien vers le dashboard** dans la page "Mon profil" du site, visible uniquement par :
   - CyberAlf (superadmin)
   - Les membres explicitement autorisés par CyberAlf depuis le panel superadmin

2. **Niveaux d'accès au dashboard** pour les membres autorisés :
   - **Page Modération** → accès complet en écriture (ajouter/supprimer mots interdits, modifier config)
   - **Autres pages** → lecture seule, avec message "Vous n'avez pas les droits pour modifier cette section" si tentative d'action
   - **Accès étendu** → CyberAlf peut ouvrir l'accès en écriture à d'autres pages individuellement pour chaque membre autorisé

3. **Connexion au dashboard** via Discord OAuth2 (même système que CyberAlf)

---

## PHASE 1 — INVESTIGATION UNIQUEMENT

Avant de coder, vérifier :

1. **Page "Mon profil" sur le site** : existe-t-elle ? Quel fichier, quelles infos affichées, comment est-elle accessible ?

2. **Système d'auth dashboard** : comment le dashboard gère-t-il actuellement les rôles (superadmin, admin) ? Quelle table Supabase, quels champs ? Comment ajouter un nouveau niveau "moderateur" ?

3. **Table users** : quels champs existent déjà (site_role, discord_id, etc.) ? Y a-t-il déjà un champ pour les permissions dashboard ?

4. **OAuth2 Discord dashboard** : comment fonctionne la connexion OAuth2 actuelle ? Où sont stockés les tokens, comment l'identité Discord est-elle vérifiée à la connexion ?

5. **Panel superadmin** : où et comment ajouter la gestion des accès dashboard (liste des membres autorisés, niveau d'accès par menu) ?

6. **Proposition de structure** pour :
   - Stocker les accès dashboard par membre (nouvelle table ou champ dans users ?)
   - Gérer les permissions par page/menu (JSON dans Supabase ?)
   - Afficher/masquer le lien dashboard dans le profil selon les droits

**Résultat attendu** : rapport complet sur ces 6 points + proposition concrète pour la Phase 2. ARRÊT obligatoire avant implémentation.

---

## PHASE 2 — IMPLÉMENTATION (après validation Alan)

### 1. Structure de données
- Nouveau champ ou table pour stocker les accès dashboard par membre :
  ```json
  {
    "discord_id": "123456789",
    "dashboard_access": true,
    "dashboard_permissions": {
      "moderation": "write",
      "membres": "read",
      "messages": "none",
      "anniversaires": "read",
      "sondages": "read",
      "route_infinie": "read",
      "evenements": "read",
      "accueil": "read"
    }
  }
  ```

### 2. Page "Mon profil" sur le site
- Ajouter un bouton/lien "🎛️ Accéder au Dashboard" visible uniquement si `dashboard_access = true` pour ce membre
- Le lien ouvre le dashboard avec authentification OAuth2 Discord

### 3. Panel superadmin du site
- Nouvelle section "Accès Dashboard" dans le panel superadmin :
  - Liste des membres ayant accès au dashboard
  - Bouton "Ajouter un membre" (recherche par pseudo)
  - Pour chaque membre : toggle par menu (Modération, Membres, Messages, etc.) avec 3 états : Aucun / Lecture / Écriture
  - Bouton "Révoquer l'accès"

### 4. Dashboard — gestion des permissions
- Au chargement de chaque page du dashboard, vérifier les permissions du membre connecté
- Si permission = "write" → fonctionnement normal
- Si permission = "read" → afficher les données mais désactiver tous les boutons/formulaires + bandeau "Vous n'avez pas les droits pour modifier cette section"
- Si permission = "none" → ne pas afficher la page ou rediriger

### 5. Lien depuis le site vers le dashboard
- URL du dashboard avec paramètre OAuth2 pré-rempli si possible, sinon lien direct vers `donjon-rouge-dashboard.onrender.com`

---

## Récap attendu Phase 1
- Réponses aux 6 points d'investigation
- Fichiers concernés identifiés
- Proposition structure de données
- Confirmation faisabilité sans casser l'existant
