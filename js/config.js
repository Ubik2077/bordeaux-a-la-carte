// ⚙️ Réglages de l'application — modifiez ici si besoin.

export const HOTEL = {
  name: 'Ibis Bordeaux Centre Gare Saint-Jean Euratlantique',
  short: 'Ibis Euratlantique',
  addr: '28 rue Charles Domercq, 33800 Bordeaux',
  la: 44.82654,
  lo: -0.55693,
};

// Adresse du service de synchronisation des notes (Google Apps Script, voir README).
// Laisser vide pour la saisir dans ⚙️ Réglages sur chaque appareil.
export const SYNC_URL = '';

// Minutes avant la fermeture où le voyant passe à l'orange
export const CLOSING_SOON_MIN = 60;

// Hypothèses de calcul des trajets (estimations, pas du temps réel)
export const TRAVEL = {
  detour: 1.3,          // repli quand le réseau de rues ne donne pas de chemin
  walkKmh: 4.8,
  bikeKmh: 14,
  bikeOverheadMin: 4,   // prendre / reposer un vélo
  taxiKmh: 20,
  taxiWaitMin: 6,       // attente d'un taxi / VTC
  trafficFactor: 1.3,   // feux, circulation en ville
  parkMin: 5,           // entrer dans le parking, se garer, en sortir
  streetParkMin: 8,     // chercher une place dans la rue
  maxParkWalkM: 700,    // distance max parking → lieu pour proposer un parking
  tramKmh: 20,          // vitesse commerciale moyenne entre arrêts
  tramDwellMin: 0.5,    // arrêt en station
  tramWaitMin: 5,       // attente moyenne en station
  tramTransferMin: 4,   // marche + attente lors d'une correspondance
  maxWalkToStopM: 1200,
};

export const PRICES = {
  tram: 1.9,            // ticket TBM 1 voyage (à vérifier sur infotbm.com)
  bike: 1.7,            // vélo en libre-service TBM, trajet court
  taxiBase: 4.5,
  taxiPerKm: 2.1,
  taxiMin: 8,
  parkingHour: 2.5,     // parking public en centre-ville, prix moyen à l'heure
};

// Catégories : icône et couleur (les libellés sont dans js/i18n.js)
export const TYPES = {
  restaurant: { icon: '🍽️', color: '#ff5a36' },
  fastfood:   { icon: '🍟', color: '#ffb400' },
  bar:        { icon: '🍸', color: '#7b4dff' },
  cocktail:   { icon: '🍹', color: '#7b4dff' },
  wine:       { icon: '🍷', color: '#b5174b' },
  pub:        { icon: '🍺', color: '#e08a00' },
  club:       { icon: '🪩', color: '#ff2fa0' },
  cafe:       { icon: '☕', color: '#8a5a3c' },
};

// Groupes de filtres affichés (cocktail est regroupé avec bar)
export const TYPE_FILTERS = ['restaurant', 'fastfood', 'bar', 'wine', 'pub', 'club', 'cafe'];
export const DEFAULT_TYPES = ['restaurant', 'bar', 'wine', 'pub'];

export const CUISINES = {
  francaise: '🥖', pizza: '🍕', italienne: '🍝', japonaise: '🍣', asiatique: '🥢', burger: '🍔', orientale: '🥙',
  indienne: '🍛', fruitsdemer: '🦪', tapas: '🫒', latino: '🌮', africaine: '🍲', vege: '🥗', creperie: '🥞',
  grill: '🥩', sucre: '🧁', autre: '🍴',
};

// Repères visuels dessinés sur la carte
export const LANDMARKS = [
  { n: 'Gare Saint-Jean', en: "Saint-Jean station", la: 44.8258, lo: -0.5561, i: '🚉' },
  { n: 'Miroir d’eau', en: "Water Mirror", la: 44.8415, lo: -0.5693, i: '💧' },
  { n: 'Place de la Bourse', en: "Place de la Bourse", la: 44.8411, lo: -0.5707, i: '🏛️' },
  { n: 'Grand-Théâtre', en: "Grand Théâtre (opera)", la: 44.8425, lo: -0.5745, i: '🎭' },
  { n: 'Cathédrale Saint-André', en: "Saint-André Cathedral", la: 44.8378, lo: -0.5777, i: '⛪' },
  { n: 'Grosse Cloche', en: "Grosse Cloche (bell gate)", la: 44.8357, lo: -0.5716, i: '🔔' },
  { n: 'Basilique Saint-Michel', en: "Saint-Michel Basilica", la: 44.8344, lo: -0.5654, i: '⛪' },
  { n: 'Marché des Capucins', en: "Capucins Market", la: 44.8306, lo: -0.5676, i: '🧺' },
  { n: 'Place des Quinconces', en: "Place des Quinconces", la: 44.8447, lo: -0.5732, i: '⛲' },
  { n: 'Jardin Public', en: "Jardin Public (park)", la: 44.8486, lo: -0.5785, i: '🌳' },
  { n: 'Cité du Vin', en: "Cité du Vin (wine museum)", la: 44.8626, lo: -0.5503, i: '🍷' },
  { n: 'Pont de pierre', en: "Stone Bridge", la: 44.8381, lo: -0.5629, i: '🌉' },
  { n: 'Pont Chaban-Delmas', en: "Chaban-Delmas Bridge", la: 44.8594, lo: -0.5524, i: '🌉' },
  { n: 'Darwin', en: "Darwin", la: 44.8494, lo: -0.5598, i: '🛹' },
  { n: 'Bassins de Lumières', en: "Bassins de Lumières", la: 44.8705, lo: -0.5578, i: '✨' },
];
