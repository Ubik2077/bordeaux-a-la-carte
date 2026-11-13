// Estimation des trajets depuis l'hôtel : à pied, tram TBM, vélo, taxi.
// Tout est calculé localement (fonctionne hors ligne). Ce sont des estimations :
// le bouton Google Maps donne l'itinéraire exact en temps réel.

import { HOTEL, TRAVEL, PRICES } from './config.js';

const R = 6371000;
export function dist(aLa, aLo, bLa, bLo) {
  const toRad = Math.PI / 180;
  const dLa = (bLa - aLa) * toRad, dLo = (bLo - aLo) * toRad;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * toRad) * Math.cos(bLa * toRad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const walkMin = (m) => (m * TRAVEL.detour) / (TRAVEL.walkKmh * 1000 / 60);

let net = null; // réseau tram précalculé depuis l'hôtel

// Dijkstra sur (arrêt, ligne) depuis l'hôtel
export function initTram(tram) {
  const stops = new Map(tram.stops.map((s) => [s.name, s]));
  const colour = Object.fromEntries(tram.lines.map((l) => [l.ref, l.colour]));
  // arêtes : clé "arrêt|ligne" → [{to, line, t}]
  const adj = new Map();
  const add = (a, b, line) => {
    const A = stops.get(a), Bs = stops.get(b);
    if (!A || !Bs) return;
    const t = (dist(A.la, A.lo, Bs.la, Bs.lo) * 1.15) / (TRAVEL.tramKmh * 1000 / 60) + TRAVEL.tramDwellMin;
    const k = a + '|' + line;
    if (!adj.has(k)) adj.set(k, []);
    adj.get(k).push({ to: b, line, t });
  };
  for (const L of tram.lines) for (const v of L.variants) for (let i = 1; i < v.length; i++) { add(v[i - 1], v[i], L.ref); add(v[i], v[i - 1], L.ref); }

  const best = new Map(); // "arrêt|ligne" → {t, prev, walk}
  const pq = [];
  const push = (k, t, prev, extra) => {
    const cur = best.get(k);
    if (cur && cur.t <= t) return;
    best.set(k, { t, prev, ...extra });
    pq.push([t, k]);
  };
  for (const s of tram.stops) {
    const d = dist(HOTEL.la, HOTEL.lo, s.la, s.lo);
    if (d > TRAVEL.maxWalkToStopM) continue;
    for (const line of s.lines) push(s.name + '|' + line, walkMin(d) + TRAVEL.tramWaitMin, null, { walk: walkMin(d), board: s.name });
  }
  while (pq.length) {
    pq.sort((a, b) => b[0] - a[0]);
    const [t, k] = pq.pop();
    if (best.get(k).t < t) continue;
    const [stop, line] = k.split('|');
    for (const e of adj.get(k) || []) push(e.to + '|' + line, t + e.t, k, {});
    // correspondance vers une autre ligne au même arrêt
    for (const other of stops.get(stop).lines) if (other !== line) push(stop + '|' + other, t + TRAVEL.tramTransferMin, k, { transfer: true });
  }
  // meilleur temps par arrêt (toutes lignes confondues)
  const atStop = new Map();
  for (const [k, v] of best) {
    const stop = k.split('|')[0];
    if (!atStop.has(stop) || atStop.get(stop).t > v.t) atStop.set(stop, { t: v.t, key: k });
  }
  net = { stops, best, atStop, colour };
}

function tramLegs(key) {
  // remonte la chaîne et découpe en tronçons par ligne
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

function money(x) { return x === 0 ? 'Gratuit' : `≈ ${x.toFixed(x < 10 ? 2 : 0).replace('.', ',').replace(',00', '')} €`; }

export function walkInfo(v) {
  const d = dist(HOTEL.la, HOTEL.lo, v.la, v.lo);
  return { d, min: walkMin(d) };
}

// Toutes les options de trajet pour un lieu
export function travelOptions(v) {
  const d = dist(HOTEL.la, HOTEL.lo, v.la, v.lo);
  const road = d * TRAVEL.detour;
  const opts = [];
  const walk = walkMin(d);
  opts.push({
    mode: 'walk', icon: '🚶', label: 'À pied', min: walk, cost: 0, costLabel: 'Gratuit',
    detail: road < 1000 ? `${Math.round(road / 10) * 10} m` : `${(road / 1000).toFixed(1).replace('.', ',')} km`,
    gmode: 'walking',
    path: [{ kind: 'walk', pts: [[HOTEL.la, HOTEL.lo], [v.la, v.lo]] }],
  });

  if (net && walk > 10) {
    let bestT = Infinity, bestStop = null;
    for (const [name, s] of net.stops) {
      const ds = dist(s.la, s.lo, v.la, v.lo);
      if (ds > TRAVEL.maxWalkToStopM) continue;
      const a = net.atStop.get(name);
      if (!a) continue;
      const t = a.t + walkMin(ds);
      if (t < bestT) { bestT = t; bestStop = name; }
    }
    if (bestStop && bestT < walk - 3) {
      const a = net.atStop.get(bestStop);
      const legs = tramLegs(a.key);
      if (legs.length) {
        const first = net.best.get(legs[0].stops[0] + '|' + legs[0].line);
        const boardStop = net.stops.get(legs[0].stops[0]);
        const dest = net.stops.get(bestStop);
        const walkEnd = walkMin(dist(dest.la, dest.lo, v.la, v.lo));
        const path = [{ kind: 'walk', pts: [[HOTEL.la, HOTEL.lo], [boardStop.la, boardStop.lo]] }];
        for (const L of legs) path.push({ kind: 'tram', colour: L.colour, pts: L.stops.map((n) => [net.stops.get(n).la, net.stops.get(n).lo]) });
        path.push({ kind: 'walk', pts: [[dest.la, dest.lo], [v.la, v.lo]] });
        opts.push({
          mode: 'tram', icon: '🚋', label: 'Tram', min: bestT, cost: PRICES.tram, costLabel: money(PRICES.tram),
          legs: legs.map((L) => ({ line: L.line, colour: L.colour, from: L.stops[0], to: L.stops[L.stops.length - 1], n: L.stops.length - 1 })),
          detail: `${Math.round(first?.walk ?? 0)} min à pied jusqu'à l'arrêt, puis ${Math.round(walkEnd)} min à l'arrivée`,
          gmode: 'transit',
          path,
        });
      }
    }
  }

  if (d > 700) {
    opts.push({
      mode: 'bike', icon: '🚲', label: 'Vélo TBM', min: road / (TRAVEL.bikeKmh * 1000 / 60) + TRAVEL.bikeOverheadMin,
      cost: PRICES.bike, costLabel: money(PRICES.bike), detail: 'Vélo en libre-service (station près de la gare)',
      gmode: 'bicycling', path: [{ kind: 'bike', pts: [[HOTEL.la, HOTEL.lo], [v.la, v.lo]] }],
    });
  }
  if (d > 900) {
    const price = Math.max(PRICES.taxiMin, PRICES.taxiBase + (road / 1000) * PRICES.taxiPerKm);
    opts.push({
      mode: 'taxi', icon: '🚕', label: 'Taxi / VTC', min: road / (TRAVEL.taxiKmh * 1000 / 60) + TRAVEL.taxiWaitMin,
      cost: price, costLabel: money(price), detail: 'Attente comprise, hors embouteillages',
      gmode: 'driving', path: [{ kind: 'taxi', pts: [[HOTEL.la, HOTEL.lo], [v.la, v.lo]] }],
    });
  }

  // badges
  const fastest = opts.reduce((a, b) => (b.min < a.min ? b : a));
  fastest.fastest = true;
  const affordable = opts.filter((o) => o.mode !== 'walk' || o.min <= 35);
  const cheapest = affordable.reduce((a, b) => (b.cost < a.cost || (b.cost === a.cost && b.min < a.min) ? b : a));
  cheapest.cheapest = true;
  // conseil
  let tip;
  if (walk <= 12) tip = 'C’est tout près, à pied sans hésiter !';
  else if (walk <= 20 && !opts.find((o) => o.mode === 'tram' && o.min < walk - 6)) tip = 'Une jolie balade à pied.';
  else if (opts.find((o) => o.mode === 'tram')) tip = 'Le tram est le meilleur compromis.';
  else tip = walk > 30 ? 'Plutôt en taxi ou à vélo.' : 'À pied ou à vélo.';
  return { opts, tip, d };
}

export function gmapsUrl(v, mode = 'walking') {
  return `https://www.google.com/maps/dir/?api=1&origin=${HOTEL.la},${HOTEL.lo}&destination=${v.la},${v.lo}&travelmode=${mode}`;
}

export const fmtMin = (m) => {
  const r = Math.max(1, Math.round(m));
  return r < 60 ? `${r} min` : `${Math.floor(r / 60)} h ${String(r % 60).padStart(2, '0')}`;
};
