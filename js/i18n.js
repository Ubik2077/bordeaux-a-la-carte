// Traductions français / anglais.
// t('clé', { variable: valeur }) renvoie le texte dans la langue active.

const D = {
  fr: {
    'lang.btn': '🌐 EN', 'lang.title': 'Switch to English',
    'brand.a': 'Bordeaux', 'brand.b': 'à la carte !', 'brand.from': 'Départ :',
    'install': '⬇ Installer',
    'search.ph': 'Nom, cuisine, rue…', 'search.label': 'Rechercher', 'clear': 'Effacer',
    'when.label': '🕒 Statut', 'when.now': 'Maintenant', 'when.midi': 'Midi', 'when.soir': '20h', 'when.tard': '23h',
    'when.custom': 'Choisir une date et une heure', 'when.group': 'Statut d’ouverture à quel moment',
    'filters': 'Filtres', 'price.group': 'Prix',
    'walk.label': 'Temps de marche maximum', 'walk.0': 'Toutes distances', 'walk.10': '≤ 10 min à pied', 'walk.n': '≤ {n} min',
    'tg.open': '🟢 Ouvert', 'tg.fav': '❤️ Coups de cœur', 'tg.ts': '☀️ Terrasse', 'tg.vg': '🥗 Végé', 'tg.wc': '♿ Accessible',
    'sort.label': 'Trier', 'sort.dist': 'Plus proches', 'sort.open': 'Ouverts d’abord', 'sort.stars': 'Mieux notés', 'sort.name': 'A → Z',
    'reset': 'Réinitialiser les filtres',
    'count.0': 'Aucun lieu', 'count.1': '1 lieu', 'count.n': '{n} lieux',
    'random': '🎲 Surprends-moi !', 'random.title': 'Tirer un lieu au hasard parmi les résultats',
    'hotel.title': 'Recentrer sur l’hôtel', 'settings.title': 'Réglages, aide et partage',
    'legend': 'Légende', 'st.open': 'Ouvert', 'st.closing': 'Ferme bientôt', 'st.closed': 'Fermé', 'st.unknown': 'Inconnu',
    'loading': 'CHARGEMENT…', 'loadError': 'OUPS ! Erreur de chargement',
    'map.label': 'Carte de Bordeaux', 'panel.label': 'Recherche et filtres', 'sheet': 'Agrandir ou réduire le panneau',
    'zoomIn': 'Zoomer', 'zoomOut': 'Dézoomer', 'hotel.bubble': 'Vous êtes ici !',

    'type.restaurant': 'Restaurant', 'type.fastfood': 'Snack', 'type.bar': 'Bar', 'type.cocktail': 'Bar à cocktails', 'type.wine': 'Bar à vin',
    'type.pub': 'Pub', 'type.club': 'Boîte de nuit', 'type.cafe': 'Café',
    'types.restaurant': 'Restaurants', 'types.fastfood': 'Snacks & fast-food', 'types.bar': 'Bars', 'types.wine': 'Bars à vin',
    'types.pub': 'Pubs & bière', 'types.club': 'Boîtes de nuit', 'types.cafe': 'Cafés',
    'cui.francaise': 'Française', 'cui.pizza': 'Pizza', 'cui.italienne': 'Italienne', 'cui.japonaise': 'Japonaise', 'cui.asiatique': 'Asiatique',
    'cui.burger': 'Burger', 'cui.orientale': 'Orientale / kebab', 'cui.indienne': 'Indienne', 'cui.fruitsdemer': 'Fruits de mer', 'cui.tapas': 'Tapas',
    'cui.latino': 'Latino', 'cui.africaine': 'Africaine', 'cui.vege': 'Végé', 'cui.creperie': 'Crêperie', 'cui.grill': 'Viande & grill',
    'cui.sucre': 'Sucré & brunch', 'cui.autre': 'Autre',
    'price.1': 'Pas cher', 'price.2': 'Moyen', 'price.3': 'Élevé',
    'priceHint.1': 'moins de 15 € / pers.', 'priceHint.2': '15 à 35 € / pers.', 'priceHint.3': 'plus de 35 € / pers.',
    'days': ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],

    'h.unknown': 'Horaires non renseignés', 'h.always': 'Ouvert 24h/24', 'h.open': 'Ouvert · ferme à {t}', 'h.openShort': 'jusqu’à {t}',
    'h.closing': 'Ferme bientôt · {t}', 'h.closingShort': 'ferme {t}', 'h.closed': 'Fermé · ouvre {w}', 'h.closedShort': 'ouvre {w}', 'h.closedNever': 'Fermé',
    'h.at': 'à {t}', 'h.tomorrow': 'demain {t}', 'h.day': '{d} {t}', 'h.dayClosed': 'Fermé', 'h.midnight': 'minuit', 'h.24': '24h/24',

    'toast.only': 'Uniquement : {x}', 'toast.reset': 'Filtres réinitialisés', 'toast.loaded': '{n} lieux chargés · données OSM du {d}',
    'toast.online': 'De retour en ligne 🌐', 'toast.offline': 'Hors ligne : la carte fonctionne toujours ✔',
    'toast.rated': 'Noté {n}/5 ⭐', 'toast.unrated': 'Note retirée', 'toast.favOn': 'Ajouté aux coups de cœur ❤️', 'toast.favOff': 'Retiré des coups de cœur',
    'toast.hideOn': 'Lieu masqué (réglages pour tout réafficher)', 'toast.hideOff': 'Lieu de nouveau visible',
    'toast.newVersion': 'Nouvelle version disponible : rechargez la page 🔄', 'toast.installed': 'App installée ! Retrouvez-la avec son icône 🎉',
    'toast.lang': 'Version française 🇫🇷',
    'cluster': '<b>{n} lieux</b> · {o} ouverts<br><small>Cliquez pour zoomer</small>',
    'banner': '🕒 Statuts affichés pour {d} {t}',
    'hover.hint': 'Cliquez pour la fiche complète ➜',
    'stars.title': 'Note de l’équipe : {n}/5', 'stars.none': 'Pas encore noté',
    'empty': '<b>Zut !</b>Aucun lieu ne correspond.<br>Essayez d’enlever un filtre.',
    'more': 'Voir plus ({n} restants)',

    'd.close': 'Fermer (Échap)', 'd.label': 'Fiche du lieu', 'd.photoOwn': 'Photo du lieu', 'd.photoIllu': 'Photo d’illustration',
    'd.priceStaff': ' (corrigé par l’équipe)', 'd.priceEst': ' (estimé)', 'd.approx': '(horaires approximatifs)',
    'd.rateTitle': 'Note de l’équipe', 'd.star': '{n} étoile(s)', 'd.favOn': 'Coup de cœur !', 'd.favOff': 'Coup de cœur ?',
    'd.go': '🧭 Comment y aller ?', 'd.qr': '📱 QR code pour le client', 'd.gmaps': '🗺️ Google Maps',
    'd.estim': 'Durées estimées depuis {from} en suivant les rues. Pour le trafic et les horaires en temps réel : Google Maps.',
    'd.hours': '🕒 Horaires', 'd.hoursComplex': '⚠️ Horaires saisonniers ou complexes : à vérifier.', 'd.hoursSrc': 'Source OSM : {x}',
    'd.hoursNone': 'Horaires non renseignés. Appelez avant d’envoyer un client !',
    'd.info': 'ℹ️ Infos', 'd.cuisine': 'Cuisine : {x}', 'd.city': '{a}, Bordeaux',
    'tag.ts': '☀️ Terrasse', 'tag.vg': '🥗 Options végé', 'tag.wc': '♿ Accessible', 'tag.ta': '🥡 À emporter',
    'd.staff': '📝 Notes de l’équipe', 'd.staffPrice': 'Prix réel :', 'd.staffPh': 'Ex. : « Réserver le week-end », « Super accueil », « Demander Paul de notre part »…',
    'd.staffHide': 'Masquer ce lieu (fermé définitivement, à éviter…)',
    'd.src': 'Données © contributeurs OpenStreetMap. Une info fausse ? <a href="{u}" target="_blank" rel="noopener">Voir / corriger sur OSM</a>',

    'm.walk': 'À pied', 'm.tram': 'Tram', 'm.bike': 'Vélo TBM', 'm.taxi': 'Taxi / VTC', 'm.car': 'Voiture',
    'free': 'Gratuit', 'perHour': 'Parking ≈ {x}/h',
    't.walk': '{d} par les rues', 't.tram': '{a} min à pied jusqu’à l’arrêt, puis {b} min à l’arrivée',
    't.bike': '{d} · vélo en libre-service TBM', 't.taxi': '{d} · attente comprise, hors embouteillages',
    't.carPark': 'Garez-vous au parking <b>{p}</b>, puis {m} min à pied', 't.carStreet': 'Stationnement dans la rue (payant en centre-ville)',
    't.stop1': '{n} arrêt', 't.stopN': '{n} arrêts',
    'b.fast': '⚡ Le plus rapide', 'b.cheap': '💰 Le plus économique',
    'tip.near': 'C’est tout près, à pied sans hésiter !', 'tip.walk': 'Une jolie balade à pied.', 'tip.tram': 'Le tram est le meilleur compromis.',
    'tip.far': 'Plutôt en taxi, à vélo ou en voiture.', 'tip.mid': 'À pied ou à vélo.',

    'qr.text': 'Le client scanne ce code avec l’appareil photo de son téléphone : l’itinéraire s’ouvre dans Google Maps.',
    'qr.info': '{m} · environ {t} depuis {from}', 'qr.open': 'Ouvrir le lien', 'qr.park': 'Destination : parking {p}',
    'slot.title': '🎰 LA ROUE DU GOÛT TOURNE…', 'slot.tada': 'TADAAA !', 'slot.none': 'Aucun lieu avec ces filtres 😅',

    'origin.label': '🚩 Départ :', 'origin.title': '🚩 Point de départ', 'origin.hotel': 'L’hôtel', 'origin.me': 'Ma position',
    'origin.meSub': 'Localisation du téléphone', 'origin.map': 'Sur la carte', 'origin.mapSub': 'Touchez un point', 'origin.mapPoint': 'Point choisi sur la carte',
    'origin.ph': 'Restaurant, bar, arrêt de tram, monument…', 'origin.quick': 'Départs fréquents :', 'origin.banner': 'Départ : {x}', 'origin.reset': 'Revenir à l’hôtel',
    'origin.pin': 'Départ', 'origin.set': 'Départ : {x}', 'origin.out': 'Ce point est en dehors de la zone couverte par la carte',
    'origin.tapMap': '👆 Touchez la carte pour choisir le départ (Échap pour annuler)', 'origin.locating': '📍 Localisation en cours…',
    'origin.fromHere': 'Partir d’ici', 'origin.fromHereDone': '🚩 Départ : {x}. Voici les lieux autour !', 'origin.stop': 'Arrêt de tram', 'origin.none': 'Aucun résultat',
    'from.hotel': 'l’hôtel', 'from.me': 'votre position', 'from.map': 'le point choisi', 'hotel.name': 'Hôtel',
    'brand.client': 'Trajets depuis votre hôtel :', 'tg.favClient': '❤️ Coups de cœur de l’hôtel', 'help.title': 'Aide',
    'hotel.bubbleClient': 'Votre hôtel', 'd.pick': 'Recommandé par la réception', 'd.gmapsGo': '🗺️ Y aller (Google Maps)', 'd.share': '📤 Partager',
    'toast.copied': 'Lien copié 📋',
    'loc.title': 'Me localiser', 'loc.unsupported': 'Localisation non disponible sur cet appareil', 'loc.denied': 'Localisation refusée ou indisponible',
    'loc.far': 'Vous êtes en dehors de la carte',
    'c.title': 'ℹ️ Bienvenue !',
    'c.helpList': [
      '<b>Touchez</b> une icône sur la carte ou un lieu de la liste : horaires, prix et trajet depuis l’hôtel.',
      'Filtrez par <b>type</b>, <b>cuisine</b>, <b>prix</b> ou <b>ouvert maintenant</b>. « 🕒 20h » montre ce qui sera ouvert ce soir.',
      '<b>❤️ Coups de cœur de l’hôtel</b> : les adresses que notre équipe recommande.',
      '<b>📍</b> affiche votre position quand vous êtes en ville.',
      '« 🗺️ Y aller » ouvre l’itinéraire dans Google Maps, « 📤 Partager » envoie l’adresse à vos proches.',
      '<b>🌐 EN</b> : English version.',
    ],
    'c.offline': 'Installez l’app pour la garder sur votre téléphone : elle fonctionne même sans connexion (pratique à l’étranger).',
    'c.dataText': '{n} lieux issus d’OpenStreetMap (mise à jour du {d}). Horaires et prix indicatifs : en cas de doute, appelez avant de vous déplacer. Une question ? Demandez à la réception !',
    's.client': '📱 Version clients',
    's.clientText': 'Une version sans les outils de la réception (commentaires internes, masquage, réglages), à partager aux clients par QR code. Ils y voient vos coups de cœur et vos étoiles, jamais vos commentaires. Elle s’installe et marche hors ligne comme celle-ci.',
    's.poster': '🖨️ Affiche QR pour les clients', 's.preview': '👀 Aperçu de la version clients', 'poster.print': '🖨️ Imprimer',
    's.title': '⚙️ Réglages & aide', 's.help': '🕹️ Mode d’emploi',
    's.helpList': [
      '<b>Survolez</b> une icône : une bulle résume le lieu. <b>Cliquez</b> pour la fiche complète et l’itinéraire.',
      '<b>Double-cliquez</b> une catégorie pour n’afficher qu’elle.',
      '« 🕒 Statut » : vérifiez qui sera ouvert <b>ce soir à 20h</b> ou à une date précise.',
      '« 📱 QR code » : le client repart avec l’itinéraire sur son téléphone.',
      '« 🌐 EN » : passez l’app en anglais pour la montrer à un client étranger.',
      'Touche <b>/</b> pour chercher, <b>Échap</b> pour fermer.',
    ],
    'sy.title': '🔄 Notes synchronisées',
    'sy.intro': 'Entrez le <b>code d’équipe</b> pour partager les notes en direct avec tous les postes (Google Sheets).',
    'sy.introNoUrl': 'Pour partager les notes en direct entre tous les postes, collez l’adresse du service Google (voir le README, « Notes synchronisées ») et le code d’équipe.',
    'sy.url': 'Adresse du service :', 'sy.code': 'Code d’équipe :', 'sy.name': 'Votre prénom :', 'sy.namePh': 'ex. Marie',
    'sy.connect': '🔗 Connecter', 'sy.now': '🔄 Synchroniser maintenant', 'sy.disconnect': 'Se déconnecter',
    'sy.needpin': '🔒 Code d’équipe requis.', 'sy.badpin': '⛔ Code d’équipe incorrect.', 'sy.syncing': '⏳ Synchronisation…',
    'sy.offline': '📴 Hors ligne : {n} modification(s) en attente, envoi automatique au retour du réseau.',
    'sy.error': '⚠️ Service injoignable : {n} modification(s) en attente, nouvel essai dans 1 min.',
    'sy.ok': '✅ Synchronisé ({ago}). Les notes des collègues arrivent toutes les minutes.', 'sy.justNow': 'à l’instant', 'sy.minAgo': 'il y a {n} min',
    'sy.connected': 'Connecté : notes partagées avec l’équipe ✔', 'sy.connectedUp': 'Connecté : {n} note(s) de cet appareil envoyée(s) ✔',
    'sy.needUrl': 'Adresse du service manquante', 'sy.fail': 'Connexion impossible : vérifiez l’adresse et le réseau',
    'sy.lastEdit': 'Modifié par {by} le {d}.', 'sy.shared': 'Partagé avec toute l’équipe.',
    's.staffTextSync': '{n} lieu(x) annoté(s){h}, partagés avec toute l’équipe. L’export sert de sauvegarde.',
    's.staff': '❤️ Notes de l’équipe',
    's.staffText': '{n} lieu(x) annoté(s){h}. Les notes sont enregistrées sur <b>cet appareil</b>. Pour les partager avec les collègues : exportez le fichier <code>equipe.json</code> et déposez-le dans le dossier <code>data/</code> du dépôt GitHub (voir le README).',
    's.hidden': ', {n} masqué(s)', 's.export': '⬇ Exporter', 's.import': '⬆ Importer', 's.unhide': '👁 Réafficher les lieux masqués', 's.wipe': '🗑 Effacer mes notes locales',
    's.wipeConfirm': 'Effacer toutes les notes enregistrées sur cet appareil ? (Le fichier partagé n’est pas touché.)',
    's.wiped': 'Notes locales effacées', 's.unhidden': 'Tous les lieux sont visibles', 's.exported': '{n} fiche(s) exportée(s)', 's.imported': '{n} fiche(s) importée(s) ✔', 's.badFile': 'Fichier invalide 😕',
    's.install': '📲 Installation & hors ligne', 's.offlineOk': '✅ L’app est disponible hors ligne sur cet appareil.', 's.offlineWait': '⏳ Le mode hors ligne s’active après le premier chargement.',
    's.isInstalled': '✅ Vous utilisez l’app installée.', 's.notInstalled': 'L’app n’est pas encore installée sur cet appareil.', 's.howInstall': '📲 Comment installer ?',
    's.data': 'ℹ️ Données',
    's.dataText': '{n} lieux · OpenStreetMap, mise à jour du {d}. Départ des trajets : {h}. Itinéraires calculés sur le réseau de rues ({p} parkings publics). Les prix (€) sont estimés selon le type de lieu : corrigez-les dans les fiches.',
    's.credits': 'Crédits photos (Wikimedia Commons)',

    'i.title': '📲 Installer l’app', 'i.already': '✅ Vous utilisez déjà l’app installée !', 'i.device': 'Votre appareil : <b>{x}</b>',
    'i.phone': '<b>Installer sur un téléphone ?</b><br>Scannez ce code avec l’appareil photo, puis touchez « Installer » dans l’app.',
    'i.others': 'Autres appareils', 'i.after': 'Une fois installée, l’app s’ouvre depuis son icône et fonctionne même sans internet.',
    'i.desktop': 'Ordinateur', 'i.inAppTitle': 'Navigateur intégré à une appli',
    'i.inApp': ['Vous avez ouvert le lien depuis une appli (WhatsApp, Messenger, scanner de QR…) : l’installation y est impossible.',
      'Touchez le menu ⋮ ou ⋯ puis <b>« Ouvrir dans {b} »</b>.', 'Suivez ensuite les étapes affichées par le bouton « Installer ».'],
    'i.iosSafari': ['Touchez le bouton <b>Partager</b> <span class="kbd">⬆︎</span> (carré avec une flèche, en bas de l’écran, ou en haut sur iPad).',
      'Faites défiler et touchez <b>« Sur l’écran d’accueil »</b> <span class="kbd">⊞</span>.', 'Touchez <b>« Ajouter »</b> en haut à droite. L’icône apparaît sur l’écran d’accueil.'],
    'i.iosOther': ['Touchez le bouton <b>Partager</b> <span class="kbd">⬆︎</span> (dans la barre d’adresse ou le menu ⋯).',
      'Choisissez <b>« Sur l’écran d’accueil »</b>, puis <b>« Ajouter »</b>.', 'L’option n’apparaît pas ? Ouvrez l’adresse dans <b>Safari</b> : c’est le navigateur le plus fiable sur iPhone.'],
    'i.samsung': ['Touchez le menu <span class="kbd">☰</span> en bas à droite.', 'Choisissez <b>« Ajouter la page à »</b> puis <b>« Écran d’accueil »</b>.', 'Validez avec <b>« Ajouter »</b>.'],
    'i.androidFirefox': ['Touchez le menu <span class="kbd">⋮</span>.', 'Choisissez <b>« Installer »</b> ou <b>« Ajouter à l’écran d’accueil »</b>.', 'Validez avec <b>« Ajouter »</b>.'],
    'i.android': ['Touchez le menu <span class="kbd">⋮</span> en haut à droite.', 'Choisissez <b>« Installer l’application »</b> (ou <b>« Ajouter à l’écran d’accueil »</b> puis <b>« Installer »</b>).',
      'Validez. L’icône apparaît sur l’écran d’accueil et dans la liste des applis.'],
    'i.edge': ['Cliquez l’icône <b>« Application disponible »</b> <span class="kbd">⊞</span> à droite de la barre d’adresse.',
      'Sinon : menu <span class="kbd">⋯</span> → <b>« Applications »</b> → <b>« Installer ce site en tant qu’application »</b>.',
      'Cliquez <b>« Installer »</b>. L’app s’ouvre dans sa propre fenêtre et peut être épinglée à la barre des tâches.'],
    'i.firefox': ['Firefox ne sait pas installer d’applications web sur ordinateur (l’app fonctionne quand même, y compris hors ligne).',
      'Pour l’installer, ouvrez cette même adresse dans <b>Microsoft Edge</b> (présent sur tous les PC Windows) ou <b>Google Chrome</b>, puis cliquez sur « Installer ».',
      'Ou simplement : ajoutez un <b>favori</b> (Ctrl + D) ou un raccourci sur le bureau.'],
    'i.safariMac': ['Menu <b>Fichier</b> → <b>« Ajouter au Dock… »</b> (macOS Sonoma ou plus récent).', 'Cliquez <b>« Ajouter »</b>. L’app apparaît dans le Dock et le Launchpad.'],
    'i.brave': ['Cliquez l’icône d’installation <span class="kbd">⤓</span> à droite de la barre d’adresse.', 'Sinon : menu <span class="kbd">≡</span> → <b>« Enregistrer et partager »</b> → <b>« Installer Bordeaux à la carte… »</b>.'],
    'i.chrome': ['Cliquez l’icône d’installation <span class="kbd">⤓</span> (petit écran avec une flèche) à droite de la barre d’adresse.',
      'Sinon : menu <span class="kbd">⋮</span> → <b>« Caster, enregistrer et partager »</b> → <b>« Installer la page en tant qu’application… »</b>.',
      'Cliquez <b>« Installer »</b>. L’app s’ouvre dans sa propre fenêtre et peut être épinglée à la barre des tâches.'],
  },

  en: {
    'lang.btn': '🌐 FR', 'lang.title': 'Passer en français',
    'brand.a': 'Bordeaux', 'brand.b': 'à la carte!', 'brand.from': 'Starting point:',
    'install': '⬇ Install',
    'search.ph': 'Name, cuisine, street…', 'search.label': 'Search', 'clear': 'Clear',
    'when.label': '🕒 Status', 'when.now': 'Now', 'when.midi': 'Noon', 'when.soir': '8 pm', 'when.tard': '11 pm',
    'when.custom': 'Pick a date and time', 'when.group': 'Show opening status for when',
    'filters': 'Filters', 'price.group': 'Price',
    'walk.label': 'Maximum walking time', 'walk.0': 'Any distance', 'walk.10': '≤ 10 min walk', 'walk.n': '≤ {n} min',
    'tg.open': '🟢 Open', 'tg.fav': '❤️ Our picks', 'tg.ts': '☀️ Terrace', 'tg.vg': '🥗 Veggie', 'tg.wc': '♿ Accessible',
    'sort.label': 'Sort', 'sort.dist': 'Closest', 'sort.open': 'Open first', 'sort.stars': 'Top rated', 'sort.name': 'A → Z',
    'reset': 'Reset filters',
    'count.0': 'No places', 'count.1': '1 place', 'count.n': '{n} places',
    'random': '🎲 Surprise me!', 'random.title': 'Pick a random place from the results',
    'hotel.title': 'Back to the hotel', 'settings.title': 'Settings, help and sharing',
    'legend': 'Legend', 'st.open': 'Open', 'st.closing': 'Closing soon', 'st.closed': 'Closed', 'st.unknown': 'Unknown',
    'loading': 'LOADING…', 'loadError': 'OOPS! Loading error',
    'map.label': 'Map of Bordeaux', 'panel.label': 'Search and filters', 'sheet': 'Expand or collapse the panel',
    'zoomIn': 'Zoom in', 'zoomOut': 'Zoom out', 'hotel.bubble': 'You are here!',

    'type.restaurant': 'Restaurant', 'type.fastfood': 'Snack bar', 'type.bar': 'Bar', 'type.cocktail': 'Cocktail bar', 'type.wine': 'Wine bar',
    'type.pub': 'Pub', 'type.club': 'Nightclub', 'type.cafe': 'Café',
    'types.restaurant': 'Restaurants', 'types.fastfood': 'Snacks & fast food', 'types.bar': 'Bars', 'types.wine': 'Wine bars',
    'types.pub': 'Pubs & beer', 'types.club': 'Nightclubs', 'types.cafe': 'Cafés',
    'cui.francaise': 'French', 'cui.pizza': 'Pizza', 'cui.italienne': 'Italian', 'cui.japonaise': 'Japanese', 'cui.asiatique': 'Asian',
    'cui.burger': 'Burgers', 'cui.orientale': 'Middle Eastern / kebab', 'cui.indienne': 'Indian', 'cui.fruitsdemer': 'Seafood', 'cui.tapas': 'Tapas',
    'cui.latino': 'Latin American', 'cui.africaine': 'African', 'cui.vege': 'Veggie', 'cui.creperie': 'Crêpes', 'cui.grill': 'Steak & grill',
    'cui.sucre': 'Sweets & brunch', 'cui.autre': 'Other',
    'price.1': 'Budget', 'price.2': 'Mid-range', 'price.3': 'Upscale',
    'priceHint.1': 'under €15 per person', 'priceHint.2': '€15–35 per person', 'priceHint.3': 'over €35 per person',
    'days': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

    'h.unknown': 'Opening hours unknown', 'h.always': 'Open 24/7', 'h.open': 'Open · closes at {t}', 'h.openShort': 'until {t}',
    'h.closing': 'Closing soon · {t}', 'h.closingShort': 'closes {t}', 'h.closed': 'Closed · opens {w}', 'h.closedShort': 'opens {w}', 'h.closedNever': 'Closed',
    'h.at': 'at {t}', 'h.tomorrow': 'tomorrow {t}', 'h.day': '{d} {t}', 'h.dayClosed': 'Closed', 'h.midnight': 'midnight', 'h.24': 'Open 24 h',

    'toast.only': 'Only: {x}', 'toast.reset': 'Filters reset', 'toast.loaded': '{n} places loaded · OSM data from {d}',
    'toast.online': 'Back online 🌐', 'toast.offline': 'Offline: the map still works ✔',
    'toast.rated': 'Rated {n}/5 ⭐', 'toast.unrated': 'Rating removed', 'toast.favOn': 'Added to our picks ❤️', 'toast.favOff': 'Removed from our picks',
    'toast.hideOn': 'Place hidden (see settings to show it again)', 'toast.hideOff': 'Place visible again',
    'toast.newVersion': 'New version available: reload the page 🔄', 'toast.installed': 'App installed! Open it from its icon 🎉',
    'toast.lang': 'English version 🇬🇧',
    'cluster': '<b>{n} places</b> · {o} open<br><small>Click to zoom in</small>',
    'banner': '🕒 Showing status for {d} {t}',
    'hover.hint': 'Click for full details ➜',
    'stars.title': 'Staff rating: {n}/5', 'stars.none': 'Not rated yet',
    'empty': '<b>Oops!</b>Nothing matches.<br>Try removing a filter.',
    'more': 'Show more ({n} left)',

    'd.close': 'Close (Esc)', 'd.label': 'Place details', 'd.photoOwn': 'Photo of the place', 'd.photoIllu': 'Illustrative photo',
    'd.priceStaff': ' (checked by our staff)', 'd.priceEst': ' (estimate)', 'd.approx': '(approximate hours)',
    'd.rateTitle': 'Staff rating', 'd.star': '{n} star(s)', 'd.favOn': 'Our pick!', 'd.favOff': 'Our pick?',
    'd.go': '🧭 Getting there', 'd.qr': '📱 QR code for your phone', 'd.gmaps': '🗺️ Google Maps',
    'd.estim': 'Estimated times from {from} along real streets. For live traffic and timetables, use Google Maps.',
    'd.hours': '🕒 Opening hours', 'd.hoursComplex': '⚠️ Seasonal or complex hours: please double-check.', 'd.hoursSrc': 'OSM source: {x}',
    'd.hoursNone': 'No opening hours listed. Best to call ahead!',
    'd.info': 'ℹ️ Info', 'd.cuisine': 'Cuisine: {x}', 'd.city': '{a}, Bordeaux',
    'tag.ts': '☀️ Terrace', 'tag.vg': '🥗 Veggie options', 'tag.wc': '♿ Wheelchair accessible', 'tag.ta': '🥡 Takeaway',
    'd.staff': '📝 Staff notes', 'd.staffPrice': 'Actual price:', 'd.staffPh': 'E.g. “Book at weekends”, “Lovely welcome”, “Ask for Paul”…',
    'd.staffHide': 'Hide this place (permanently closed, not recommended…)',
    'd.src': 'Data © OpenStreetMap contributors. Something wrong? <a href="{u}" target="_blank" rel="noopener">View / fix on OSM</a>',

    'm.walk': 'On foot', 'm.tram': 'Tram', 'm.bike': 'City bike', 'm.taxi': 'Taxi / ride-hailing', 'm.car': 'Car',
    'free': 'Free', 'perHour': 'Parking ≈ {x}/h',
    't.walk': '{d} along the streets', 't.tram': '{a} min walk to the stop, then {b} min at the other end',
    't.bike': '{d} · TBM bike share', 't.taxi': '{d} · incl. waiting time, excl. traffic jams',
    't.carPark': 'Park at <b>{p}</b> car park, then {m} min walk', 't.carStreet': 'Street parking (paid in the city centre)',
    't.stop1': '{n} stop', 't.stopN': '{n} stops',
    'b.fast': '⚡ Fastest', 'b.cheap': '💰 Cheapest',
    'tip.near': 'It’s very close — just walk!', 'tip.walk': 'A nice walk through the city.', 'tip.tram': 'The tram is your best bet.',
    'tip.far': 'Best by taxi, bike or car.', 'tip.mid': 'On foot or by bike.',

    'qr.text': 'Scan this code with your phone camera: the directions open in Google Maps.',
    'qr.info': '{m} · about {t} from {from}', 'qr.open': 'Open link', 'qr.park': 'Destination: {p} car park',
    'slot.title': '🎰 SPINNING THE WHEEL OF TASTE…', 'slot.tada': 'TA-DAAA!', 'slot.none': 'No places with these filters 😅',

    'origin.label': '🚩 From:', 'origin.title': '🚩 Starting point', 'origin.hotel': 'The hotel', 'origin.me': 'My location',
    'origin.meSub': 'Phone location', 'origin.map': 'On the map', 'origin.mapSub': 'Tap a point', 'origin.mapPoint': 'Point picked on the map',
    'origin.ph': 'Restaurant, bar, tram stop, landmark…', 'origin.quick': 'Popular starting points:', 'origin.banner': 'From: {x}', 'origin.reset': 'Back to the hotel',
    'origin.pin': 'Start', 'origin.set': 'From: {x}', 'origin.out': 'This point is outside the area covered by the map',
    'origin.tapMap': '👆 Tap the map to choose the starting point (Esc to cancel)', 'origin.locating': '📍 Finding your location…',
    'origin.fromHere': 'Start from here', 'origin.fromHereDone': '🚩 From: {x}. Here is what’s nearby!', 'origin.stop': 'Tram stop', 'origin.none': 'No results',
    'from.hotel': 'the hotel', 'from.me': 'your location', 'from.map': 'the chosen point', 'hotel.name': 'Hotel',
    'brand.client': 'Directions from your hotel:', 'tg.favClient': '❤️ Hotel picks', 'help.title': 'Help',
    'hotel.bubbleClient': 'Your hotel', 'd.pick': 'Recommended by our front desk', 'd.gmapsGo': '🗺️ Go there (Google Maps)', 'd.share': '📤 Share',
    'toast.copied': 'Link copied 📋',
    'loc.title': 'Show my location', 'loc.unsupported': 'Location not available on this device', 'loc.denied': 'Location denied or unavailable',
    'loc.far': 'You are outside the map area',
    'c.title': 'ℹ️ Welcome!',
    'c.helpList': [
      '<b>Tap</b> an icon on the map or a place in the list: opening hours, prices and directions from the hotel.',
      'Filter by <b>type</b>, <b>cuisine</b>, <b>price</b> or <b>open now</b>. “🕒 8 pm” shows what will be open tonight.',
      '<b>❤️ Hotel picks</b>: places our team recommends.',
      '<b>📍</b> shows where you are when you’re out in town.',
      '“🗺️ Go there” opens directions in Google Maps, “📤 Share” sends the place to friends.',
      '<b>🌐 FR</b>: version française.',
    ],
    'c.offline': 'Install the app to keep it on your phone: it even works without a connection (handy when abroad).',
    'c.dataText': '{n} places from OpenStreetMap (updated {d}). Hours and prices are indicative: if in doubt, call ahead. Any questions? Ask at the front desk!',
    's.client': '📱 Guest version',
    's.clientText': 'A version without the front-desk tools (internal comments, hiding, settings), to share with guests by QR code. They see your picks and stars, never your comments. It installs and works offline like this one.',
    's.poster': '🖨️ QR poster for guests', 's.preview': '👀 Preview guest version', 'poster.print': '🖨️ Print',
    's.title': '⚙️ Settings & help', 's.help': '🕹️ How to use',
    's.helpList': [
      '<b>Hover</b> over an icon for a quick summary. <b>Click</b> for full details and directions.',
      '<b>Double-click</b> a category to show only that one.',
      '“🕒 Status”: check what will be open <b>tonight at 8 pm</b> or at any date.',
      '“📱 QR code”: the guest leaves with the directions on their phone.',
      '“🌐 FR”: switch the app back to French.',
      'Press <b>/</b> to search, <b>Esc</b> to close.',
    ],
    'sy.title': '🔄 Synced notes',
    'sy.intro': 'Enter the <b>team code</b> to share notes live with every device (Google Sheets).',
    'sy.introNoUrl': 'To share notes live between all devices, paste the Google service address (see README, “Notes synchronisées”) and the team code.',
    'sy.url': 'Service address:', 'sy.code': 'Team code:', 'sy.name': 'Your first name:', 'sy.namePh': 'e.g. Mary',
    'sy.connect': '🔗 Connect', 'sy.now': '🔄 Sync now', 'sy.disconnect': 'Disconnect',
    'sy.needpin': '🔒 Team code required.', 'sy.badpin': '⛔ Wrong team code.', 'sy.syncing': '⏳ Syncing…',
    'sy.offline': '📴 Offline: {n} change(s) waiting, sent automatically when back online.',
    'sy.error': '⚠️ Service unreachable: {n} change(s) waiting, retrying in 1 min.',
    'sy.ok': '✅ Synced ({ago}). Colleagues’ notes arrive every minute.', 'sy.justNow': 'just now', 'sy.minAgo': '{n} min ago',
    'sy.connected': 'Connected: notes shared with the team ✔', 'sy.connectedUp': 'Connected: {n} note(s) from this device uploaded ✔',
    'sy.needUrl': 'Service address missing', 'sy.fail': 'Could not connect: check the address and network',
    'sy.lastEdit': 'Edited by {by} on {d}.', 'sy.shared': 'Shared with the whole team.',
    's.staffTextSync': '{n} place(s) annotated{h}, shared with the whole team. Export is a backup.',
    's.staff': '❤️ Staff notes',
    's.staffText': '{n} place(s) annotated{h}. Notes are saved on <b>this device</b>. To share them with colleagues, export <code>equipe.json</code> and upload it to the <code>data/</code> folder of the GitHub repository (see README).',
    's.hidden': ', {n} hidden', 's.export': '⬇ Export', 's.import': '⬆ Import', 's.unhide': '👁 Show hidden places', 's.wipe': '🗑 Delete my local notes',
    's.wipeConfirm': 'Delete all notes saved on this device? (The shared file is not affected.)',
    's.wiped': 'Local notes deleted', 's.unhidden': 'All places are visible', 's.exported': '{n} record(s) exported', 's.imported': '{n} record(s) imported ✔', 's.badFile': 'Invalid file 😕',
    's.install': '📲 Install & offline', 's.offlineOk': '✅ The app is available offline on this device.', 's.offlineWait': '⏳ Offline mode turns on after the first load.',
    's.isInstalled': '✅ You are using the installed app.', 's.notInstalled': 'The app is not installed on this device yet.', 's.howInstall': '📲 How to install',
    's.data': 'ℹ️ Data',
    's.dataText': '{n} places · OpenStreetMap, updated {d}. Directions start from {h}. Routes follow the real street network ({p} public car parks). Prices (€) are estimated from the type of place.',
    's.credits': 'Photo credits (Wikimedia Commons)',

    'i.title': '📲 Install the app', 'i.already': '✅ You are already using the installed app!', 'i.device': 'Your device: <b>{x}</b>',
    'i.phone': '<b>Install on a phone?</b><br>Scan this code with the camera, then tap “Install” in the app.',
    'i.others': 'Other devices', 'i.after': 'Once installed, open the app from its icon — it even works offline.',
    'i.desktop': 'Computer', 'i.inAppTitle': 'In-app browser',
    'i.inApp': ['You opened the link inside another app (WhatsApp, Messenger, QR scanner…): installing is not possible there.',
      'Tap the ⋮ or ⋯ menu, then <b>“Open in {b}”</b>.', 'Then follow the steps shown by the “Install” button.'],
    'i.iosSafari': ['Tap the <b>Share</b> button <span class="kbd">⬆︎</span> (square with an arrow, at the bottom — or top on iPad).',
      'Scroll down and tap <b>“Add to Home Screen”</b> <span class="kbd">⊞</span>.', 'Tap <b>“Add”</b> in the top right corner. The icon appears on your home screen.'],
    'i.iosOther': ['Tap the <b>Share</b> button <span class="kbd">⬆︎</span> (in the address bar or the ⋯ menu).',
      'Choose <b>“Add to Home Screen”</b>, then <b>“Add”</b>.', 'Not there? Open the address in <b>Safari</b>, the most reliable browser on iPhone.'],
    'i.samsung': ['Tap the <span class="kbd">☰</span> menu at the bottom right.', 'Choose <b>“Add page to”</b>, then <b>“Home screen”</b>.', 'Confirm with <b>“Add”</b>.'],
    'i.androidFirefox': ['Tap the <span class="kbd">⋮</span> menu.', 'Choose <b>“Install”</b> or <b>“Add to Home screen”</b>.', 'Confirm with <b>“Add”</b>.'],
    'i.android': ['Tap the <span class="kbd">⋮</span> menu at the top right.', 'Choose <b>“Install app”</b> (or <b>“Add to Home screen”</b>, then <b>“Install”</b>).',
      'Confirm. The icon appears on the home screen and in your app list.'],
    'i.edge': ['Click the <b>“App available”</b> icon <span class="kbd">⊞</span> on the right of the address bar.',
      'Otherwise: <span class="kbd">⋯</span> menu → <b>“Apps”</b> → <b>“Install this site as an app”</b>.',
      'Click <b>“Install”</b>. The app opens in its own window and can be pinned to the taskbar.'],
    'i.firefox': ['Firefox cannot install web apps on desktop (the app still works, even offline).',
      'To install it, open this address in <b>Microsoft Edge</b> (on every Windows PC) or <b>Google Chrome</b>, then click “Install”.',
      'Or simply add a <b>bookmark</b> (Ctrl + D) or a desktop shortcut.'],
    'i.safariMac': ['<b>File</b> menu → <b>“Add to Dock…”</b> (macOS Sonoma or later).', 'Click <b>“Add”</b>. The app appears in the Dock and Launchpad.'],
    'i.brave': ['Click the install icon <span class="kbd">⤓</span> on the right of the address bar.', 'Otherwise: <span class="kbd">≡</span> menu → <b>“Save and share”</b> → <b>“Install Bordeaux à la carte…”</b>.'],
    'i.chrome': ['Click the install icon <span class="kbd">⤓</span> (small screen with an arrow) on the right of the address bar.',
      'Otherwise: <span class="kbd">⋮</span> menu → <b>“Cast, save, and share”</b> → <b>“Install page as app…”</b>.',
      'Click <b>“Install”</b>. The app opens in its own window and can be pinned to the taskbar.'],
  },
};

let lang = (() => {
  try { const s = localStorage.getItem('cb.lang'); if (s === 'fr' || s === 'en') return s; } catch { /* stockage indisponible */ }
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
})();

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  try { localStorage.setItem('cb.lang', l); } catch { /* stockage indisponible */ }
  document.documentElement.lang = l;
}

export function t(key, vars) {
  let s = D[lang][key] ?? D.fr[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? ''));
  return s;
}

// Formats dépendant de la langue
export function fmtTime(min) {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  if (lang === 'en') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${h}h${m ? String(m).padStart(2, '0') : ''}`;
}
export function fmtMoney(x) {
  if (x === 0) return t('free');
  const n = x.toFixed(x < 10 ? 2 : 0);
  return lang === 'en' ? `≈ €${n.replace('.00', '')}` : `≈ ${n.replace('.', ',').replace(',00', '')} €`;
}
export function fmtDist(m) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = (m / 1000).toFixed(1);
  return `${lang === 'en' ? km : km.replace('.', ',')} km`;
}
export function fmtDate(iso) {
  if (!iso) return '?';
  const [y, mo, d] = iso.split('-');
  return lang === 'en' ? `${d}/${mo}/${y}` : `${d}/${mo}/${y}`;
}

// Applique les traductions aux éléments statiques de la page (attributs data-i18n*)
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.innerHTML = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  document.documentElement.lang = lang;
}
