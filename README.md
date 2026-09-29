# MOKA — site vitrine

Site statique de MOKA (café, bubble tea & cocktails — 6 rue Vaugelas, Annecy).
Aucune dépendance, aucun build : HTML + CSS + JS.

## Structure

```
index.html            page unique (concept, lieu, carte v5, événements, ateliers, privatisation, réservation, contact)
mentions-legales.html / confidentialite.html
api/reservation.js    fonction serverless : réservation de table + demandes atelier / privatisation
assets/css/style.css  styles + palettes dynamiques morning / afternoon / night
assets/js/main.js     détection du moment de la journée, curseur, slider, animations
assets/img/           logos (jour / nuit), photos, favicon
vercel.json           cache long des assets + en-têtes de sécurité
```

## Voir en local

```bash
npx serve .
```

## Déployer sur Vercel

1. Pousser ce dossier sur GitHub.
2. Vercel → Add New → Project → importer le dépôt.
3. Framework preset : **Other**. Build command : vide. Output directory : `.` (racine).
4. Deploy. Chaque push sur `main` redéploie automatiquement.

Pour le domaine : Vercel → Project → Settings → Domains → ajouter `moka-annecy.com`.

## Réservation en ligne (activation)

Les formulaires (table, atelier, privatisation) envoient vers `/api/reservation`, qui :
- vérifie la demande (jours d'ouverture mar→sam, créneaux, champs obligatoires, anti-spam) ;
- envoie un email au restaurant (répondre = confirmer au client) ;
- envoie un accusé de réception au client.

Tant que la clé n'est pas configurée, le formulaire affiche le téléphone et un lien email pré-rempli.

1. Créer un compte sur https://resend.com (gratuit jusqu'à 3 000 emails/mois).
2. Resend → Domains → ajouter `moka-annecy.com` et poser les enregistrements DNS indiqués.
3. Resend → API Keys → créer une clé.
4. Vercel → moka-annecy → Settings → Environment Variables :
   - `RESEND_API_KEY` = la clé
   - `RESERVATION_FROM` = `MOKA <reservations@moka-annecy.com>`
   - `RESERVATION_TO` = adresse qui reçoit les réservations (défaut : bonjour@moka-annecy.com)
5. Redéployer.

Créneaux : toutes les 30 min, de 9h à 20h (mar→jeu) et de 9h à 0h30 (ven→sam), jusqu'à 90 jours à l'avance, 1 à 10 couverts.
