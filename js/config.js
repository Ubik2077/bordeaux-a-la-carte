// ⚙️ Réglages de l'application — modifiez ici si besoin.

export const HOTEL = {
  name: 'Ibis Bordeaux Centre Gare Saint-Jean Euratlantique',
  short: 'Ibis Euratlantique',
  addr: '28 rue Charles Domercq, 33800 Bordeaux',
  la: 44.82654,
  lo: -0.55693,
};

// Minutes avant la fermeture où le voyant passe à l'orange
export const CLOSING_SOON_MIN = 60;

// Hypothèses de calcul des trajets (estimations, pas du temps réel)
export const TRAVEL = {
  detour: 1.3,          // les rues ne sont pas à vol d'oiseau
  walkKmh: 4.8,
  bikeKmh: 14,
  bikeOverheadMin: 4,   // prendre / reposer un vélo
  taxiKmh: 20,
  taxiWaitMin: 6,       // attente d'un taxi / VTC
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
};

export const TYPES = {
  restaurant: { label: 'Restaurant', plural: 'Restaurants', icon: '🍽️', color: '#ff5a36' },
  fastfood:   { label: 'Snack', plural: 'Snacks & fast-food', icon: '🍟', color: '#ffb400' },
  bar:        { label: 'Bar', plural: 'Bars', icon: '🍸', color: '#7b4dff' },
  cocktail:   { label: 'Bar à cocktails', plural: 'Bars à cocktails', icon: '🍹', color: '#7b4dff' },
  wine:       { label: 'Bar à vin', plural: 'Bars à vin', icon: '🍷', color: '#b5174b' },
  pub:        { label: 'Pub', plural: 'Pubs & bière', icon: '🍺', color: '#e08a00' },
  club:       { label: 'Boîte de nuit', plural: 'Boîtes de nuit', icon: '🪩', color: '#ff2fa0' },
  cafe:       { label: 'Café', plural: 'Cafés', icon: '☕', color: '#8a5a3c' },
};

// Groupes de filtres affichés (cocktail est regroupé avec bar)
export const TYPE_FILTERS = ['restaurant', 'fastfood', 'bar', 'wine', 'pub', 'club', 'cafe'];
export const DEFAULT_TYPES = ['restaurant', 'bar', 'wine', 'pub'];

export const CUISINES = {
  francaise:   { label: 'Française', icon: '🥖' },
  pizza:       { label: 'Pizza', icon: '🍕' },
  italienne:   { label: 'Italienne', icon: '🍝' },
  japonaise:   { label: 'Japonaise', icon: '🍣' },
  asiatique:   { label: 'Asiatique', icon: '🥢' },
  burger:      { label: 'Burger', icon: '🍔' },
  orientale:   { label: 'Orientale / kebab', icon: '🥙' },
  indienne:    { label: 'Indienne', icon: '🍛' },
  fruitsdemer: { label: 'Fruits de mer', icon: '🦪' },
  tapas:       { label: 'Tapas', icon: '🫒' },
  latino:      { label: 'Latino', icon: '🌮' },
  africaine:   { label: 'Africaine', icon: '🍲' },
  vege:        { label: 'Végé', icon: '🥗' },
  creperie:    { label: 'Crêperie', icon: '🥞' },
  grill:       { label: 'Viande & grill', icon: '🥩' },
  sucre:       { label: 'Sucré & brunch', icon: '🧁' },
  autre:       { label: 'Autre', icon: '🍴' },
};

export const PRICE_LABELS = { 1: 'Pas cher', 2: 'Moyen', 3: 'Élevé' };
export const PRICE_HINT = { 1: 'moins de 15 € / pers.', 2: '15 à 35 € / pers.', 3: 'plus de 35 € / pers.' };

// Repères visuels dessinés sur la carte
export const LANDMARKS = [
  { n: 'Gare Saint-Jean', la: 44.8258, lo: -0.5561, i: '🚉' },
  { n: 'Miroir d’eau', la: 44.8415, lo: -0.5693, i: '💧' },
  { n: 'Place de la Bourse', la: 44.8411, lo: -0.5707, i: '🏛️' },
  { n: 'Grand-Théâtre', la: 44.8425, lo: -0.5745, i: '🎭' },
  { n: 'Cathédrale Saint-André', la: 44.8378, lo: -0.5777, i: '⛪' },
  { n: 'Grosse Cloche', la: 44.8357, lo: -0.5716, i: '🔔' },
  { n: 'Basilique Saint-Michel', la: 44.8344, lo: -0.5654, i: '⛪' },
  { n: 'Marché des Capucins', la: 44.8306, lo: -0.5676, i: '🧺' },
  { n: 'Place des Quinconces', la: 44.8447, lo: -0.5732, i: '⛲' },
  { n: 'Jardin Public', la: 44.8486, lo: -0.5785, i: '🌳' },
  { n: 'Cité du Vin', la: 44.8626, lo: -0.5503, i: '🍷' },
  { n: 'Pont de pierre', la: 44.8381, lo: -0.5629, i: '🌉' },
  { n: 'Pont Chaban-Delmas', la: 44.8594, lo: -0.5524, i: '🌉' },
  { n: 'Darwin', la: 44.8494, lo: -0.5598, i: '🛹' },
  { n: 'Bassins de Lumières', la: 44.8705, lo: -0.5578, i: '✨' },
];
