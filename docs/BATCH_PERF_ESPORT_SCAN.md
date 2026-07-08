# Batch site/backend — Performance superadmin + E-Sport off + Bouton forcer le scan
## Site web Donjon Rouge (frontend + backend)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter l'existant avant toute modification pour chacune des 3 tâches
- Ne rien casser dans le reste du site (roulette, journal, inscriptions, etc. — déjà modifiés récemment, ne pas y retoucher)
- Traiter les 3 tâches à la suite dans cette même session, mais les documenter séparément dans le récap

---

## TÂCHE 1 — Infos de performance manquantes en accès superadmin

**Contexte** : dans l'accès superadmin, les informations de performance (probablement liées à `member_participation`, déjà utilisée pour `/classement` côté bot, ou aux résultats LDC/GDC déjà affichés côté public) n'apparaissent pas alors qu'elles étaient censées être fonctionnelles.

**À faire** :
1. Investigue où et comment ces infos de performance sont censées s'afficher côté superadmin (quel composant, quel endpoint backend, quelle table Supabase)
2. Identifie pourquoi elles n'apparaissent pas (données absentes en base, erreur d'appel API, bug d'affichage, permission insuffisante)
3. Corrige la cause trouvée

Si le problème s'avère être une feature jamais réellement implémentée plutôt qu'un bug (aucune donnée n'a jamais existé), dis-le clairement dans le récap plutôt que d'inventer quelque chose — dans ce cas, ne code rien de plus, attends la validation d'Alan.

---

## TÂCHE 2 — Page E-Sport "off" avec image d'attente

**Contexte** : Alan va fermer temporairement le clan E-Sport. Le toggle `esport_enabled` existe déjà dans `bot_config` (créé lors du fix du bug 404 précédent). Actuellement, quand `esport_enabled = false`, vérifie ce qui se passe réellement pour un visiteur non-superadmin (redirection, page blanche, message générique ?).

**À faire** :
1. Vérifie le comportement actuel exact quand `esport_enabled = false`
2. Remplace ce comportement par un affichage propre : une image d'attente (utiliser un placeholder simple type bannière avec le logo Donjon Rouge si aucune image dédiée n'existe, ou prévoir une zone où Alan pourra uploader sa propre image plus tard — à l'appréciation de Claude Code selon la simplicité d'implémentation) + un message clair du type "Le clan E-Sport est actuellement en pause, revenez bientôt !"
3. Les superadmins doivent toujours pouvoir accéder à la vraie page (avec le toggle) même quand elle est "off" pour le public, comme c'est déjà le cas actuellement

---

## TÂCHE 3 — Bouton "Forcer le scan" dans le panel superadmin

**Contexte** : `syncMembers.js` tourne automatiquement au démarrage du backend puis toutes les heures. Alan veut un bouton dans le panel superadmin pour déclencher ce scan à la demande, sans attendre le cycle automatique ni redémarrer le service.

**À faire** :
1. Crée un nouvel endpoint backend (ex: `POST /api/admin/sync-members`, réservé superadmin, même pattern de permission que les autres routes admin) qui appelle directement la fonction `syncMembers()` déjà existante
2. Ajoute un bouton "🔄 Forcer le scan" dans le panel superadmin (`Admin.jsx` ou composant équivalent) qui appelle cet endpoint
3. Affiche un retour clair à l'utilisateur (loading pendant le scan, confirmation une fois terminé avec le nombre de membres synchronisés/partis détectés si disponible, ou juste "Scan terminé ✅")
4. Attention : `syncMembers()` peut prendre du temps (boucle sur tous les membres avec appels API CoC) — gère bien l'état de chargement côté frontend pour ne pas donner l'impression que le bouton est cassé

---

## Récap attendu de Claude Code
Pour chacune des 3 tâches séparément : fichiers modifiés, diagnostic (tâche 1), comportement exact implémenté (tâche 2), et confirmation du bouton fonctionnel (tâche 3). Migration SQL si nécessaire pour l'une des 3 tâches.
