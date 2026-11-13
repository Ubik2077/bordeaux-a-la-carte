# 🍽️ Bordeaux à la carte !

Carte interactive style BD des **bars et restaurants de Bordeaux**, pensée pour la réception de l'hôtel
**Ibis Bordeaux Centre Gare Saint-Jean Euratlantique** (28 rue Charles Domercq).

- 1 792 lieux (restaurants, snacks, bars, bars à vin, pubs, boîtes de nuit, cafés), issus d'OpenStreetMap
- Voyant **🟢 ouvert / 🟠 ferme bientôt / 🔴 fermé / ⚪ inconnu**, mis à jour chaque minute
- Bouton **🕒 Statut** : voir qui sera ouvert *ce midi*, *à 20h*, *à 23h* ou à une date précise
- **Trajets depuis l'hôtel** : à pied, tram TBM (avec lignes et correspondances), vélo, taxi, avec durée, prix et badges « le plus rapide » / « le plus économique »
- **QR code** : le client scanne et repart avec l'itinéraire Google Maps sur son téléphone
- **🎲 Surprends-moi !** : tirage au sort parmi les résultats
- **Notes de l'équipe** : étoiles, coups de cœur ❤️, prix corrigé, commentaire, masquer un lieu
- **PWA** : s'installe sur ordinateur, Android et iPhone, et **fonctionne hors ligne** (le plan est dessiné par l'app, aucune tuile à télécharger)

## 🕹️ Utilisation

| Action | Effet |
|---|---|
| Survoler une icône | Bulle d'info (type, prix, note, statut, temps de trajet) |
| Cliquer une icône ou une ligne de la liste | Fiche complète + itinéraire animé sur la carte |
| Cliquer une catégorie | L'afficher / la masquer |
| Double-cliquer une catégorie | N'afficher qu'elle |
| `/` | Aller dans la recherche |
| `Échap` | Fermer la fiche ou la fenêtre |

Les prix : **€** pas cher (moins de 15 €/pers.), **€€** moyen (15 à 35 €), **€€€** élevé (plus de 35 €).
OpenStreetMap ne donne pas les prix : ils sont **estimés** selon le type de lieu, à corriger dans les fiches.

## 🚀 Mettre l'app en ligne (gratuit)

L'app est un simple dossier de fichiers statiques, sans serveur ni base de données.

**Option 1 : Netlify (le plus simple)**
1. Créez un compte gratuit sur <https://app.netlify.com>.
2. Menu *Sites* → *Add new site* → *Deploy manually*, puis glissez-déposez **tout le dossier** du projet.
3. Netlify vous donne une adresse du type `https://bordeaux-a-la-carte.netlify.app`. Vous pouvez la renommer dans *Site configuration*.
4. Pour une mise à jour : *Deploys* → glissez à nouveau le dossier.

**Option 2 : GitHub Pages**
Déposez le dossier dans un dépôt GitHub, puis *Settings → Pages → Deploy from branch (main, /root)*.

> ⚠️ L'adresse publique est accessible à toute personne qui la connaît. Elle ne contient aucune donnée
> personnelle, seulement des lieux publics et les notes que vous publiez dans `data/equipe.json`.

## 📲 Installer sur chaque appareil

Ouvrez l'adresse une première fois avec internet, puis :
- **Ordinateur (Chrome / Edge)** : bouton « ⬇ Installer » dans l'app, ou icône d'installation dans la barre d'adresse.
- **Android** : menu ⋮ → « Installer l'application ».
- **iPhone / iPad (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

Ensuite l'app s'ouvre comme une application et fonctionne **sans connexion**.

## ❤️ Partager les notes de l'équipe

Les étoiles, coups de cœur, prix corrigés et commentaires sont enregistrés **sur l'appareil** où ils sont saisis.
Pour les partager avec tous les postes :
1. ⚙️ Réglages → **Exporter** : un fichier `equipe.json` est téléchargé.
2. Remplacez `data/equipe.json` dans le dossier de l'app par ce fichier.
3. Republiez le dossier (voir plus haut). Tous les appareils récupèrent les notes au prochain chargement avec internet.

Un collègue peut aussi **Importer** un fichier `equipe.json` reçu par e-mail ou sur une clé USB.

## 🔄 Mettre à jour les lieux

Les données viennent d'OpenStreetMap (mise à jour du 13/11/2026). Pour les rafraîchir (Node.js 18 ou plus) :

```bash
node scripts/fetch-osm.mjs
```

Puis republiez le dossier. Un lieu faux ou fermé ? Masquez-le dans sa fiche, ou corrigez-le directement
sur OpenStreetMap (lien en bas de chaque fiche) : tout le monde en profite.

## ⚙️ Réglages

Dans [js/config.js](js/config.js) :
- `HOTEL` : point de départ des trajets
- `CLOSING_SOON_MIN` : minutes avant la fermeture où le voyant passe à l'orange (60 par défaut)
- `TRAVEL` / `PRICES` : vitesses et tarifs utilisés pour les estimations (ticket TBM, taxi…)
- `TYPES`, `CUISINES` : libellés, couleurs et icônes

## 🧪 Tester en local

```bash
python3 -m http.server 8642
```

Puis ouvrez <http://localhost:8642>.

## ⚠️ Limites à connaître

- Les **durées de trajet** sont des estimations (distance × détour, vitesse moyenne, attente du tram).
  Pour le temps réel, utilisez le bouton Google Maps ou le QR code.
- Les **horaires** viennent d'OpenStreetMap : environ la moitié des lieux les renseignent, et ils peuvent être
  anciens. Les horaires saisonniers sont signalés « approximatifs ».
- Les **photos** sont des illustrations libres de droits par type de cuisine (Wikimedia Commons, crédits dans
  ⚙️ Réglages). Quand OpenStreetMap a une photo du lieu, elle est affichée (avec internet).
- Pas de notes Google : la qualité affichée, ce sont **les étoiles de votre équipe**.

## 📁 Structure

```
index.html, manifest.webmanifest, sw.js   page, manifeste PWA, service worker (hors ligne)
css/app.css                                style BD
js/app.js                                  carte, filtres, fiches, QR, tirage au sort
js/basemap.js                              dessin du plan (Garonne, rues, parcs, tram)
js/hours.js                                lecture des horaires OSM, statut ouvert/fermé
js/routing.js                              estimation des trajets (marche, tram, vélo, taxi)
js/config.js                               réglages
data/                                      lieux, plan, tram, crédits photos, notes d'équipe
scripts/fetch-osm.mjs                      mise à jour des données OpenStreetMap
vendor/, fonts/, img/                      Leaflet, polices BD, icônes et photos
```

Données © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
