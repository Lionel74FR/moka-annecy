# Story météo MOKA

Chaque matin d'ouverture (mardi → samedi), une tâche planifiée :

1. lance `python3 social/tools/meteo/meteo.py` (météo d'Annecy via Open-Meteo) ;
2. pousse `social/meteo/AAAA-MM-JJ.jpg` sur la branche `social-media` ;
3. programme la story Instagram dans Metricool (marque Moka, 8h15).

Les messages sont dans `BANK` (meteo.py). Règles : tutoiement, titres sans point final,
9h / 16€ / 20h30 collés, pas de bubble tea tant qu'il n'est pas servi, photos réelles uniquement.
Pour ajouter une photo : la déposer dans `photos/` (JPG ~1200 px) et la référencer dans `BANK`.
