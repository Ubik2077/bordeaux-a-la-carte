# 🍽️ Bordeaux à la carte !

Carte interactive style BD des **bars et restaurants de Bordeaux**, pensée pour la réception de l'hôtel
**Ibis Bordeaux Centre Gare Saint-Jean Euratlantique** (28 rue Charles Domercq).

- 1 792 lieux (restaurants, snacks, bars, bars à vin, pubs, boîtes de nuit, cafés), issus d'OpenStreetMap
- Voyant **🟢 ouvert / 🟠 ferme bientôt / 🔴 fermé / ⚪ inconnu**, mis à jour chaque minute
- Bouton **🕒 Statut** : voir qui sera ouvert *ce midi*, *à 20h*, *à 23h* ou à une date précise
- **Vrais itinéraires depuis l'hôtel**, calculés hors ligne sur le réseau de rues (sens uniques et rues piétonnes respectés) : à pied, tram TBM (lignes et correspondances), vélo, taxi et **voiture** (jusqu'au parking public le plus proche du lieu, puis à pied), avec durée, prix et badges « le plus rapide » / « le plus économique »
- **Version anglaise** : bouton 🌐 EN / FR, toute l'app est traduite (fiches, horaires, trajets, QR code, monuments)
- **QR code** : le client scanne et repart avec l'itinéraire Google Maps sur son téléphone
- **🎲 Surprends-moi !** : tirage au sort parmi les résultats
- **Notes de l'équipe** : étoiles, coups de cœur ❤️, prix corrigé, commentaire, masquer un lieu, **synchronisées en direct** entre tous les postes (Google Sheets)
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

## 🌍 L'app en ligne

👉 **<https://ubik2077.github.io/bordeaux-a-la-carte/>**

Hébergée gratuitement par GitHub Pages, depuis le dépôt <https://github.com/Ubik2077/bordeaux-a-la-carte>.
Le QR code [qr-installation.svg](qr-installation.svg) mène à cette adresse : imprimez-le ou affichez-le pour
installer l'app sur les téléphones de l'équipe.

**Publier une modification** : chaque envoi (push) sur la branche `main` met le site à jour en 1 à 2 minutes.

```bash
git add -A && git commit -m "Mise à jour" && git push
```

Sans ligne de commande : sur la page GitHub du dépôt, ouvrez le dossier voulu (par exemple `data/`), puis
*Add file → Upload files*, déposez le fichier et validez avec *Commit changes*.

> ⚠️ L'adresse est publique : toute personne qui la connaît peut ouvrir l'app. Elle ne contient aucune donnée
> personnelle, seulement des lieux publics et les notes que vous publiez dans `data/equipe.json`.

**Autre hébergeur (Netlify…)** : lancez `sh scripts/preparer-publication.sh`. Vous obtenez un dossier
`publication/` et une archive `bordeaux-a-la-carte.zip` qui ne contiennent que l'app, prêts à glisser-déposer.

## 📲 Installer sur chaque appareil

Ouvrez l'adresse une première fois avec internet, puis :
- **Ordinateur (Chrome / Edge)** : bouton « ⬇ Installer » dans l'app, ou icône d'installation dans la barre d'adresse.
- **Android** : menu ⋮ → « Installer l'application ».
- **iPhone / iPad (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

Ensuite l'app s'ouvre comme une application et fonctionne **sans connexion**.

## 📱 Version clients (QR code)

Une version **pour les clients**, sans les outils de la réception, à leur partager par QR code :
👉 **<https://ubik2077.github.io/bordeaux-a-la-carte/?client>**

- Elle contient la carte, les filtres, les horaires, les trajets depuis l'hôtel, le français et l'anglais, l'installation et le hors ligne,
  plus un bouton **📍 Me localiser** et un bouton **📤 Partager** pour envoyer une adresse.
- Les clients voient vos **❤️ coups de cœur** et vos **étoiles** (« Recommandé par la réception »), jamais vos commentaires internes,
  et les lieux que vous avez masqués n'apparaissent pas.
- **Affiche à imprimer** : ⚙️ Réglages → **📱 Version clients → 🖨️ Affiche QR pour les clients** (format A5, bilingue).
- Le téléphone du client mémorise le mode client, même une fois l'app installée. Sur un poste de la réception,
  utilisez le bouton « 👀 Aperçu », qui ne change pas de mode. Pour revenir à la version réception : ajoutez `?reception` à l'adresse.

> Pour que les clients voient vos coups de cœur, ceux-ci doivent être publiés : soit via la synchronisation Google
> (avec `SYNC_URL` renseignée dans [js/config.js](js/config.js)), soit via un fichier `data/equipe.json` exporté puis déposé sur GitHub.

## 🔄 Notes synchronisées (Google Sheets)

Les étoiles, coups de cœur, prix corrigés et commentaires peuvent être **partagés en direct** entre tous les
postes et téléphones. Ils sont stockés dans un Google Sheets de l'hôtel, que vous pouvez aussi consulter,
trier ou corriger à la main. Un **code d'équipe** protège l'accès, et hors ligne les modifications attendent
puis partent au retour du réseau.

### Mise en place (une seule fois, environ 5 minutes)
1. Avec le compte Google de l'hôtel, créez un **Google Sheets** vide, par exemple « Bordeaux à la carte – notes ».
2. Menu **Extensions → Apps Script**. Effacez le contenu et collez tout le fichier
   [scripts/google-apps-script/Code.gs](scripts/google-apps-script/Code.gs).
3. Ligne `const CODE_EQUIPE = 'CHANGEZ-MOI';` : remplacez `CHANGEZ-MOI` par votre code (ex. `ibis2026`), puis 💾 Enregistrer.
4. Bouton **Déployer → Nouveau déploiement**. Cliquez l'engrenage ⚙️ → **Application Web**, puis réglez :
   - *Exécuter en tant que* : **Moi**
   - *Qui a accès* : **Tout le monde**
5. **Déployer**. Google demande d'autoriser l'accès : choisissez votre compte. Si l'écran « Google n'a pas validé
   cette application » apparaît, cliquez *Paramètres avancés → Accéder au projet*. C'est normal : c'est votre propre script.
6. Copiez l'**URL de l'application Web** (elle se termine par `/exec`).

### Sur chaque appareil
⚙️ Réglages → **🔄 Notes synchronisées** : collez l'adresse, tapez le code d'équipe et votre prénom, puis **Connecter**.
Les notes déjà saisies sur l'appareil sont envoyées automatiquement.

> 💡 Pour ne plus avoir à coller l'adresse sur chaque appareil, renseignez-la dans `SYNC_URL`
> ([js/config.js](js/config.js)) et republiez : il ne restera que le code d'équipe à taper.

Le voyant sur ⚙️ indique l'état : 🟢 synchronisé, 🟠 modifications en attente, 🔴 service injoignable.
Chaque fiche affiche qui a fait la dernière modification, et quand.

**Changer le code d'équipe** : modifiez-le dans le script, puis *Déployer → Gérer les déploiements → ✏️ →
Version : Nouvelle version → Déployer*. L'adresse ne change pas, et chacun retape le nouveau code.

**Sans synchronisation** : ⚙️ Réglages → **Exporter** télécharge `equipe.json`. Déposé dans le dossier `data/`
du dépôt GitHub (*Add file → Upload files*), il sert de notes de base à tous les appareils. Il sert aussi de sauvegarde.

## 🔄 Mettre à jour les lieux

Les données viennent d'OpenStreetMap (mise à jour du 13/11/2026). Pour les rafraîchir (Node.js 18 ou plus) :

```bash
node scripts/fetch-osm.mjs
```

Puis publiez la modification (voir « L'app en ligne »). Un lieu faux ou fermé ? Masquez-le dans sa fiche, ou corrigez-le directement
sur OpenStreetMap (lien en bas de chaque fiche) : tout le monde en profite.

## ⚙️ Réglages

Dans [js/config.js](js/config.js) :
- `HOTEL` : point de départ des trajets
- `CLOSING_SOON_MIN` : minutes avant la fermeture où le voyant passe à l'orange (60 par défaut)
- `TRAVEL` / `PRICES` : vitesses et tarifs utilisés pour les estimations (ticket TBM, taxi, parking…)

Les textes français et anglais sont dans [js/i18n.js](js/i18n.js).
- `TYPES`, `CUISINES` : libellés, couleurs et icônes

## 🧪 Tester en local

```bash
python3 -m http.server 8642
```

Puis ouvrez <http://localhost:8642>.

## ⚠️ Limites à connaître

- Les **durées de trajet** sont des estimations : les chemins suivent les vraies rues, mais les vitesses sont des moyennes (pas de trafic en temps réel, attente moyenne du tram).
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
js/routing.js                              trajets (marche, tram, vélo, taxi, voiture + parking)
js/graph.js                                moteur d'itinéraires hors ligne sur le réseau de rues
js/i18n.js                                 traductions français / anglais
js/sync.js                                 synchronisation des notes avec Google Sheets
scripts/google-apps-script/Code.gs         script à coller dans Google Sheets (notes partagées)
js/config.js                               réglages
data/                                      lieux, plan, tram, réseau routier, parkings, crédits photos, notes d'équipe
scripts/fetch-osm.mjs                      mise à jour des données OpenStreetMap
vendor/, fonts/, img/                      Leaflet, polices BD, icônes et photos
```

Données © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
