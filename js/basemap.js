// Fond de carte « bande dessinée » dessiné à partir des données OSM embarquées.
// Aucune tuile n'est téléchargée : tout fonctionne hors ligne.

import { LANDMARKS } from './config.js';

const L = window.L;

// Palette BD
const INK = '#1b1b1b';
const C = {
  water: '#6fc7f0', waterLine: INK,
  green: '#9bd76e', greenLine: '#2f5d1e',
  major: '#ffd23f', secondary: '#ffffff', minor: '#ffffff', ped: '#ffe9c7',
  rail: '#5a5a5a',
};

// Épaisseurs (px) selon le zoom : [casing, fill] par classe de route
function widths(z) {
  const k = Math.max(0, z - 13); // 0 à 6
  return {
    1: [3 + k * 2.2, 1.6 + k * 1.6],
    2: [2.6 + k * 1.9, 1.2 + k * 1.4],
    3: [1.8 + k * 1.5, 0.6 + k * 1.1],
    4: [z < 14 ? 0 : 0.8 + (k - 1) * 1.15, z < 14 ? 0.5 : 0.2 + (k - 1) * 0.9],
    5: [z < 15 ? 0 : 0.6 + (k - 2) * 0.9, z < 15 ? 0 : 0.3 + (k - 2) * 0.7],
  };
}

export function drawBasemap(map, bm, tram) {
  const renderer = L.canvas({ padding: 0.4, tolerance: 0 });
  map.createPane('base'); map.getPane('base').style.zIndex = 250;
  map.createPane('labels'); map.getPane('labels').style.zIndex = 450;
  map.getPane('labels').style.pointerEvents = 'none';
  const opt = { renderer, pane: 'base', interactive: false };

  // Parcs
  L.polygon(bm.green, { ...opt, color: C.greenLine, weight: 1.2, fillColor: C.green, fillOpacity: 1, opacity: 0.7 }).addTo(map);
  // Eau
  const water = L.polygon(bm.water, { ...opt, color: C.waterLine, weight: 2.4, fillColor: C.water, fillOpacity: 1 }).addTo(map);
  // Voies ferrées
  const railCasing = L.polyline(bm.rail, { ...opt, color: C.rail, weight: 3, opacity: 0.55 }).addTo(map);
  const railTies = L.polyline(bm.rail, { ...opt, color: '#f6ecd4', weight: 1.4, dashArray: '4 6', opacity: 0.9 }).addTo(map);

  // Routes : on dessine tous les contours noirs, puis tous les remplissages
  const cls = [5, 4, 3, 2, 1];
  const fills = { 1: C.major, 2: C.secondary, 3: C.secondary, 4: C.minor, 5: C.ped };
  const casings = {}, inner = {};
  for (const k of cls) casings[k] = L.polyline(bm.roads[k], { ...opt, color: INK, opacity: k >= 4 ? 0.55 : 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  for (const k of cls) inner[k] = L.polyline(bm.roads[k], { ...opt, color: fills[k], lineCap: 'round', lineJoin: 'round' }).addTo(map);

  // Lignes de tram
  const tramLayers = [];
  for (const line of tram.lines) {
    tramLayers.push(L.polyline(line.geom, { ...opt, color: INK, weight: 6, opacity: 0.9 }).addTo(map));
    tramLayers.push(L.polyline(line.geom, { ...opt, color: line.colour, weight: 3.2 }).addTo(map));
  }

  function restyle() {
    const z = map.getZoom();
    const w = widths(z);
    for (const k of cls) {
      casings[k].setStyle({ weight: w[k][0], opacity: w[k][0] ? (k >= 4 ? 0.55 : 1) : 0 });
      inner[k].setStyle({ weight: w[k][1], opacity: w[k][1] ? 1 : 0 });
    }
    const tw = 2 + Math.max(0, z - 13) * 0.9;
    tramLayers.forEach((l, i) => l.setStyle({ weight: i % 2 ? tw : tw + 3 }));
    water.setStyle({ weight: z >= 15 ? 3 : 2 });
    railCasing.setStyle({ weight: z >= 15 ? 4 : 2.5 });
    const c = map.getContainer();
    c.className = c.className.replace(/\bz-\d+\b/g, '') + ' z-' + z;
  }
  map.on('zoomend', restyle);
  restyle();

  // Noms de quartiers
  for (const [name, la, lo, rank] of bm.places) {
    L.marker([la, lo], {
      pane: 'labels', interactive: false, keyboard: false,
      icon: L.divIcon({ className: `lbl-place rank-${rank}`, html: `<span>${name}</span>`, iconSize: null }),
    }).addTo(map);
  }
  // Noms de rues (zoom élevé)
  for (const [name, la, lo, ang, k] of bm.labels) {
    L.marker([la, lo], {
      pane: 'labels', interactive: false, keyboard: false,
      icon: L.divIcon({ className: `lbl-street k-${k}`, html: `<span style="transform:translate(-50%,-50%) rotate(${ang}deg)">${name}</span>`, iconSize: null }),
    }).addTo(map);
  }
  // Arrêts de tram
  for (const s of tram.stops) {
    const col = tram.lines.find((l) => l.ref === s.lines[0])?.colour || '#333';
    L.marker([s.la, s.lo], {
      pane: 'labels', interactive: false, keyboard: false,
      icon: L.divIcon({
        className: 'lbl-stop', iconSize: null,
        html: `<i style="--c:${col}"></i><span>${s.name} <b>${s.lines.map((l) => `<em style="--c:${tram.lines.find((x) => x.ref === l)?.colour}">${l}</em>`).join('')}</b></span>`,
      }),
    }).addTo(map);
  }
  // Monuments (nom traduit selon la langue)
  for (const lm of LANDMARKS) {
    landmarkMarkers.push([lm, L.marker([lm.la, lm.lo], {
      pane: 'labels', interactive: false, keyboard: false, icon: landmarkIcon(lm, 'fr'),
    }).addTo(map)]);
  }
}

const landmarkMarkers = [];
const landmarkIcon = (lm, lang) => L.divIcon({ className: 'lbl-landmark', iconSize: null, html: `<i>${lm.i}</i><span>${lang === 'en' ? lm.en || lm.n : lm.n}</span>` });
export function setLandmarkLang(lang) {
  for (const [lm, m] of landmarkMarkers) m.setIcon(landmarkIcon(lm, lang));
}
