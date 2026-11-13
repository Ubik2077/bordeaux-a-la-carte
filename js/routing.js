// Trajets depuis l'hôtel : à pied, tram TBM, vélo, taxi, voiture (+ parking).
// Itinéraires calculés sur le vrai réseau de rues (hors ligne). Les durées restent des
// estimations : le bouton Google Maps donne le temps réel.
// Ce module ne produit pas de texte : l'affichage (et la langue) est géré par app.js.

import { HOTEL, TRAVEL, PRICES } from './config.js';
import { RoadGraph, hav } from './graph.js';

export const dist = hav;
const WALK = (TRAVEL.walkKmh * 1000) / 60; // m / min
const BIKE = (TRAVEL.bikeKmh * 1000) / 60;
// Point de départ des trajets : l'hôtel par défaut, modifiable (position, lieu, point de la carte)
let O = { la: HOTEL.la, lo: HOTEL.lo, kind: 'hotel' };
const OPT = () => [O.la, O.lo];

let G = null, footTree = null, carTree = null, hFoot = null, hCar = null;
let parks = [];
let net = null, tramData = null;

export function initRouting({ graph, tram, parkings }) {
  G = new RoadGraph(graph);
  tramData = tram;
  parks = parkings.filter((p) => snap(p, 'car'));
  buildFromOrigin();
}

// Recalcule les plus courts chemins depuis le point de départ (≈ 30 ms)
function buildFromOrigin() {
  hFoot = G.nearest(O.la, O.lo, 'foot');
  hCar = G.nearest(O.la, O.lo, 'car');
  footTree = hFoot ? G.tree('foot', hFoot.node) : null;
  carTree = hCar ? G.tree('car', hCar.node) : null;
  initTram(tramData);
}

export function setOrigin(o) {
  O = o ? { ...o } : { la: HOTEL.la, lo: HOTEL.lo, kind: 'hotel' };
  if (G) buildFromOrigin();
}
export const getOrigin = () => O;

// Carrefour le plus proche d'un point (mis en cache sur l'objet)
function snap(p, mode) {
  const k = mode === 'foot' ? '_sf' : '_sc';
  if (p[k] === undefined) p[k] = G ? G.nearest(p.la, p.lo, mode) : null;
  return p[k];
}

// Distance à pied réelle (m) depuis l'hôtel, ou null si inconnue
function footFromHotel(p) {
  const s = snap(p, 'foot');
  if (!s || !footTree) return null;
  const d = footTree.dist[s.node];
  return isFinite(d) ? d + s.d + (hFoot?.d || 0) : null;
}

export function walkInfo(v) {
  const straight = hav(O.la, O.lo, v.la, v.lo);
  const d = footFromHotel(v) ?? straight * TRAVEL.detour;
  return { d, min: d / WALK };
}

function walkPathFromHotel(p) {
  const s = snap(p, 'foot');
  const pts = s && footTree && G.treePath(footTree, s.node);
  return pts ? [OPT(), ...pts, [p.la, p.lo]] : [OPT(), [p.la, p.lo]];
}

// Marche entre deux points : estimation rapide, ou vrai chemin si withPath
function walkBetween(a, b, withPath) {
  if (withPath && G) {
    const sa = snap(a, 'foot'), sb = snap(b, 'foot');
    const r = sa && sb && G.route('foot', sa.node, sb.node);
    if (r) {
      const m = r.len + sa.d + sb.d;
      return { m, min: m / WALK, pts: [[a.la, a.lo], ...r.pts, [b.la, b.lo]] };
    }
  }
  const m = hav(a.la, a.lo, b.la, b.lo) * TRAVEL.detour;
  return { m, min: m / WALK, pts: [[a.la, a.lo], [b.la, b.lo]] };
}

// Trajet voiture depuis l'hôtel jusqu'à un point
function driveTo(p, withPath) {
  const s = snap(p, 'car');
  if (!s || !carTree || !isFinite(carTree.dist[s.node])) {
    const m = hav(O.la, O.lo, p.la, p.lo) * TRAVEL.detour;
    return { m, min: m / ((TRAVEL.taxiKmh * 1000) / 60), pts: [OPT(), [p.la, p.lo]] };
  }
  const min = (carTree.dist[s.node] / 60) * TRAVEL.trafficFactor + ((hCar?.d || 0) + s.d) / WALK * 0.3;
  const m = carTree.len[s.node] + s.d + (hCar?.d || 0);
  let pts = [OPT(), [p.la, p.lo]];
  if (withPath) { const tp = G.treePath(carTree, s.node); if (tp) pts = [OPT(), ...tp, [p.la, p.lo]]; }
  return { m, min, pts };
}

// ---------------------------------------------------------------- Tram
function initTram(tram) {
  const stops = new Map(tram.stops.map((s) => [s.name, s]));
  const colour = Object.fromEntries(tram.lines.map((l) => [l.ref, l.colour]));
  const adj = new Map();
  const add = (a, b, line) => {
    const A = stops.get(a), B = stops.get(b);
    if (!A || !B) return;
    const t = (hav(A.la, A.lo, B.la, B.lo) * 1.15) / ((TRAVEL.tramKmh * 1000) / 60) + TRAVEL.tramDwellMin;
    const k = a + '|' + line;
    if (!adj.has(k)) adj.set(k, []);
    adj.get(k).push({ to: b, t });
  };
  for (const L of tram.lines) for (const v of L.variants) for (let i = 1; i < v.length; i++) { add(v[i - 1], v[i], L.ref); add(v[i], v[i - 1], L.ref); }

  const best = new Map();
  const pq = [];
  const push = (k, t, prev, extra) => {
    const cur = best.get(k);
    if (cur && cur.t <= t) return;
    best.set(k, { t, prev, ...extra });
    pq.push([t, k]);
  };
  for (const s of tram.stops) {
    if (hav(O.la, O.lo, s.la, s.lo) > TRAVEL.maxWalkToStopM) continue;
    const walk = (footFromHotel(s) ?? hav(O.la, O.lo, s.la, s.lo) * TRAVEL.detour) / WALK;
    for (const line of s.lines) push(s.name + '|' + line, walk + TRAVEL.tramWaitMin, null, { walk });
  }
  while (pq.length) {
    pq.sort((a, b) => b[0] - a[0]);
    const [t, k] = pq.pop();
    if (best.get(k).t < t) continue;
    const [stop, line] = k.split('|');
    for (const e of adj.get(k) || []) push(e.to + '|' + line, t + e.t, k, {});
    for (const other of stops.get(stop).lines) if (other !== line) push(stop + '|' + other, t + TRAVEL.tramTransferMin, k, {});
  }
  const atStop = new Map();
  for (const [k, v] of best) {
    const stop = k.split('|')[0];
    if (!atStop.has(stop) || atStop.get(stop).t > v.t) atStop.set(stop, { t: v.t, key: k });
  }
  net = { stops, best, atStop, colour };
}

function tramLegs(key) {
  const chain = [];
  for (let k = key; k; k = net.best.get(k).prev) chain.unshift(k);
  const legs = [];
  for (const k of chain) {
    const [stop, line] = k.split('|');
    const last = legs[legs.length - 1];
    if (!last || last.line !== line) legs.push({ line, colour: net.colour[line], stops: [stop] });
    else last.stops.push(stop);
  }
  return legs.filter((l) => l.stops.length > 1);
}

// ---------------------------------------------------------------- Options de trajet
export function travelOptions(v, { paths = false } = {}) {
  const w = walkInfo(v);
  const opts = [];
  const walkPts = paths ? walkPathFromHotel(v) : [OPT(), [v.la, v.lo]];

  opts.push({ mode: 'walk', icon: '🚶', min: w.min, cost: 0, m: w.d, gmode: 'walking', path: [{ kind: 'walk', pts: walkPts }] });

  // Tram
  if (net && w.min > 10) {
    let bestT = Infinity, bestStop = null;
    for (const [name, s] of net.stops) {
      const ds = hav(s.la, s.lo, v.la, v.lo);
      if (ds > TRAVEL.maxWalkToStopM) continue;
      const a = net.atStop.get(name);
      if (!a) continue;
      const t = a.t + (ds * TRAVEL.detour) / WALK;
      if (t < bestT) { bestT = t; bestStop = name; }
    }
    if (bestStop && bestT < w.min - 3) {
      const legs = tramLegs(net.atStop.get(bestStop).key);
      if (legs.length) {
        const board = net.stops.get(legs[0].stops[0]);
        const dest = net.stops.get(bestStop);
        const first = net.best.get(legs[0].stops[0] + '|' + legs[0].line);
        const end = walkBetween(dest, v, paths);
        const min = net.atStop.get(bestStop).t + end.min;
        const path = [{ kind: 'walk', pts: paths ? walkPathFromHotel(board) : [OPT(), [board.la, board.lo]] }];
        for (const L of legs) path.push({ kind: 'tram', colour: L.colour, pts: L.stops.map((n) => [net.stops.get(n).la, net.stops.get(n).lo]) });
        path.push({ kind: 'walk', pts: end.pts });
        opts.push({
          mode: 'tram', icon: '🚋', min, cost: PRICES.tram, gmode: 'transit',
          legs: legs.map((L) => ({ line: L.line, colour: L.colour, from: L.stops[0], to: L.stops[L.stops.length - 1], n: L.stops.length - 1 })),
          walkStart: first?.walk ?? 0, walkEnd: end.min, path,
        });
      }
    }
  }

  // Vélo en libre-service (sur le réseau piéton/cyclable)
  if (w.d > 700) {
    opts.push({ mode: 'bike', icon: '🚲', min: w.d / BIKE + TRAVEL.bikeOverheadMin, cost: PRICES.bike, m: w.d, gmode: 'bicycling', path: [{ kind: 'bike', pts: walkPts }] });
  }

  // Taxi / VTC
  if (w.d > 900) {
    const dr = driveTo(v, paths);
    const price = Math.max(PRICES.taxiMin, PRICES.taxiBase + (dr.m / 1000) * PRICES.taxiPerKm);
    opts.push({ mode: 'taxi', icon: '🚕', min: dr.min + TRAVEL.taxiWaitMin, cost: price, m: dr.m, gmode: 'driving', path: [{ kind: 'taxi', pts: dr.pts }] });
  }

  // Voiture personnelle : jusqu'au parking public le plus proche du lieu, puis à pied
  if (w.min > 10) {
    let park = null, pd = Infinity;
    for (const p of parks) {
      const d = hav(p.la, p.lo, v.la, v.lo);
      if (d < pd) { pd = d; park = p; }
    }
    if (park && pd <= TRAVEL.maxParkWalkM) {
      const dr = driveTo(park, paths);
      const end = walkBetween(park, v, paths);
      opts.push({
        mode: 'car', icon: '🚗', min: dr.min + TRAVEL.parkMin + end.min, cost: PRICES.parkingHour * 2, perHour: PRICES.parkingHour,
        m: dr.m, parking: park.n, walkEnd: end.min, gmode: 'driving', dest: [park.la, park.lo],
        path: [{ kind: 'car', pts: dr.pts }, { kind: 'walk', pts: end.pts }],
      });
    } else {
      const dr = driveTo(v, paths);
      opts.push({
        mode: 'car', icon: '🚗', min: dr.min + TRAVEL.streetParkMin, cost: PRICES.parkingHour * 2, perHour: PRICES.parkingHour,
        m: dr.m, street: true, gmode: 'driving', path: [{ kind: 'car', pts: dr.pts }],
      });
    }
  }

  // Badges
  const fastest = opts.reduce((a, b) => (b.min < a.min ? b : a));
  fastest.fastest = true;
  const affordable = opts.filter((o) => o.mode !== 'walk' || o.min <= 35);
  const cheapest = affordable.reduce((a, b) => (b.cost < a.cost || (b.cost === a.cost && b.min < a.min) ? b : a));
  cheapest.cheapest = true;

  // Conseil (clé de traduction)
  const tram = opts.find((o) => o.mode === 'tram');
  let tip;
  if (w.min <= 12) tip = 'near';
  else if (w.min <= 20 && !(tram && tram.min < w.min - 6)) tip = 'walk';
  else if (tram) tip = 'tram';
  else tip = w.min > 30 ? 'far' : 'mid';
  return { opts, tip, d: w.d };
}

export function gmapsUrl(v, o) {
  const dest = o?.dest || [v.la, v.lo];
  // depuis « ma position », Google Maps utilise directement la localisation du téléphone
  const origin = O.kind === 'me' ? '' : `&origin=${O.la},${O.lo}`;
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${dest[0]},${dest[1]}&travelmode=${o?.gmode || 'walking'}`;
}

export const fmtMin = (m) => {
  const r = Math.max(1, Math.round(m));
  return r < 60 ? `${r} min` : `${Math.floor(r / 60)} h ${String(r % 60).padStart(2, '0')}`;
};
