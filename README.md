# MOKA — site vitrine

Site statique de MOKA (café, bubble tea & cocktails — 6 rue Vaugelas, Annecy).
Aucune dépendance, aucun build : HTML + CSS + JS.

## Structure

```
index.html            page unique (sections concept, carte, events, ateliers, privatisation, contact)
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
