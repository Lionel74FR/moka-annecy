# Story météo MOKA

Chaque matin d'ouverture (mardi → samedi), une tâche planifiée :

1. lance `python3 social/tools/meteo/meteo.py` (météo d'Annecy via Open-Meteo) ;
2. pousse `social/meteo/AAAA-MM-JJ.jpg` sur la branche `social-media` ;
3. programme la story Instagram + Facebook dans Metricool (marque Moka, 8h15).

Les messages sont dans `BANK` (meteo.py). Règles : tutoiement, titres sans point final,
9h / 16€ / 20h30 collés, pas de bubble tea tant qu'il n'est pas servi, photos réelles uniquement.
La story météo est toujours en texte + logo, sans photo.
Registre des photos publiées : `social/photos-usage.json` (une photo = au plus 1 post et 1 story par plateforme).
