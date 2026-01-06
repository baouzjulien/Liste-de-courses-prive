lien de test de l'app : https://baouzjulien.github.io/Liste-de-courses/

# Liste de Courses Collaborative

Une petite application web pour gérer une liste de courses avec des rayons et des produits, synchronisée via Google Sheets. Optimisée pour un usage mobile et desktop. Utilisation idéale pour deux utilisateurs max car synchronisation depuis API au raffraichissement de la page.

## Fonctionnalités

- Création, modification et suppression de rayons.
- Ajout, modification et suppression de produits.
- Autocomplétion et prévention des doublons.
- Marquer les produits comme achetés.
- Collapse/expand des rayons pour une vue compacte.
- Drag & drop des rayons sur mobile et desktop.
- Synchronisation automatique avec Google Sheets (backup côté serveur).
- Sauvegarde locale pour réduire la latence côté client.
- Installation comme PWA (service worker pour cache et offline).

## Installation

1. Ouvrir le fichier `index.html` dans un navigateur moderne.
2. Pour installer en tant qu’application (PWA) : accepter l’invite d’installation (disponible via le service worker).

## Configuration

- L’URL de l’API Google Sheets est définie dans `script.js` :  
```js
const API_URL = "https://script.google.com/macros/s/AKfycbx1y9Bjn_5n7v6s8lZ_QZ0PyeofuxoYO4Sp6lWj_blouZe-84ml35IPB0zdSF8vc0Y/exec";
