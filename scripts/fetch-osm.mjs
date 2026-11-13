#!/usr/bin/env node
// Télécharge les données OpenStreetMap (Overpass API) pour Bordeaux et génère
// les fichiers compacts utilisés par l'application :
//   data/venues.json   → bars & restaurants
//   data/basemap.json  → fond de carte dessiné (Garonne, parcs, rues, quartiers)
//   data/tram.json     → lignes et arrêts de tram TBM
//
// Usage : node scripts/fetch-osm.mjs           (télécharge tout)
//         node scripts/fetch-osm.mjs --cache   (réutilise les réponses brutes déjà téléchargées)

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(os.tmpdir(), 'carte-bordeaux-osm'); // réponses brutes (hors du projet)
const OUT = path.join(ROOT, 'data');
const USE_CACHE = process.argv.includes('--cache');

// Zone couverte : Bordeaux centre + quartiers proches (sud, nord, Bastide)
const BBOX = { s: 44.805, w: -0.625, n: 44.885, e: -0.52 };
const B = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
// Zone un peu plus large pour le fond de carte (évite les bords vides)
const BB2 = { s: 44.79, w: -0.645, n: 44.9, e: -0.50 };
const B2 = `${BB2.s},${BB2.w},${BB2.n},${BB2.e}`;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function overpass(name, query) {
  const file = path.join(RAW, `${name}.json`);
  if (USE_CACHE && existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  for (const url of ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        process.stdout.write(`↓ ${name} (${new URL(url).host}, essai ${attempt})… `);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'carte-bordeaux-pwa/1.0' },
          body: 'data=' + encodeURIComponent(query),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        await writeFile(file, JSON.stringify(json));
        console.log(`${json.elements.length} éléments`);
        return json;
      } catch (e) {
        console.log('échec', e.message);
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
  }
  throw new Error('Overpass indisponible pour ' + name);
}

const r5 = (x) => Math.round(x * 1e5) / 1e5;
const pt = (p) => [r5(p.lat), r5(p.lon)];

// Simplification Douglas-Peucker (tolérance en degrés)
function simplify(points, tol) {
  if (points.length < 3) return points;
  const sq = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
      t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px, ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > max) { max = d; idx = i; }
    }
    if (max > sq && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

// Assemble des morceaux de chemins (way) en anneaux fermés
function assembleRings(ways) {
  const segs = ways.map((w) => w.slice());
  const rings = [];
  const key = (p) => p[0] + ',' + p[1];
  while (segs.length) {
    let ring = segs.pop();
    let guard = 0;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && guard++ < 5000) {
      const end = key(ring[ring.length - 1]);
      const i = segs.findIndex((s) => key(s[0]) === end || key(s[s.length - 1]) === end);
      if (i < 0) break;
      let s = segs.splice(i, 1)[0];
      if (key(s[0]) !== end) s = s.reverse();
      ring = ring.concat(s.slice(1));
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

// Découpe un polygone sur un rectangle (Sutherland–Hodgman)
function clipRing(ring, bb) {
  const edges = [
    (p) => p[0] >= bb.s, (p) => p[0] <= bb.n, (p) => p[1] >= bb.w, (p) => p[1] <= bb.e,
  ];
  const inter = [
    (a, b) => lerp(a, b, (bb.s - a[0]) / (b[0] - a[0])),
    (a, b) => lerp(a, b, (bb.n - a[0]) / (b[0] - a[0])),
    (a, b) => lerp(a, b, (bb.w - a[1]) / (b[1] - a[1])),
    (a, b) => lerp(a, b, (bb.e - a[1]) / (b[1] - a[1])),
  ];
  function lerp(a, b, t) { return [r5(a[0] + (b[0] - a[0]) * t), r5(a[1] + (b[1] - a[1]) * t)]; }
  let out = ring;
  for (let k = 0; k < 4; k++) {
    const input = out; out = [];
    if (!input.length) break;
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      const ci = edges[k](cur), pi = edges[k](prev);
      if (ci) { if (!pi) out.push(inter[k](prev, cur)); out.push(cur); }
      else if (pi) out.push(inter[k](prev, cur));
    }
  }
  return out;
}

const inBox = (p, bb) => p[0] >= bb.s && p[0] <= bb.n && p[1] >= bb.w && p[1] <= bb.e;

// ---------------------------------------------------------------- Lieux
function classify(t) {
  const a = t.amenity;
  const cuisine = (t.cuisine || '').toLowerCase();
  if (a === 'bar' && /wine/.test(cuisine + (t['drink:wine'] || '') + (t.bar || '') + (t.name || '').toLowerCase().replace('vin', 'wine'))) return 'wine';
  if (a === 'bar' && /(cocktail)/.test(cuisine + (t.name || '').toLowerCase())) return 'cocktail';
  if (a === 'biergarten') return 'pub';
  return { restaurant: 'restaurant', fast_food: 'fastfood', bar: 'bar', pub: 'pub', nightclub: 'club', cafe: 'cafe' }[a];
}

const CUISINE_MAP = [
  [/(^|;)\s*(french|regional|bistro|brasserie|traditional|southwest)/, 'francaise'],
  [/pizza/, 'pizza'],
  [/italian/, 'italienne'],
  [/(sushi|japanese|ramen)/, 'japonaise'],
  [/(chinese|vietnamese|thai|asian|korean|cambodian|laotian|dim_sum|noodle|poke)/, 'asiatique'],
  [/(burger|american|hot_dog|sandwich|bagel)/, 'burger'],
  [/(kebab|turkish|lebanese|greek|middle_eastern|oriental|falafel|syrian)/, 'orientale'],
  [/(indian|pakistani|nepalese|sri_lankan)/, 'indienne'],
  [/(seafood|fish|oyster)/, 'fruitsdemer'],
  [/(spanish|tapas|portuguese|basque)/, 'tapas'],
  [/(mexican|latin|peruvian|brazilian|argentin|tex-mex|colombian)/, 'latino'],
  [/(african|moroccan|ethiopian|senegal|algerian|tunisian|maghreb|couscous)/, 'africaine'],
  [/(vegan|vegetarian)/, 'vege'],
  [/(crepe|crêpe|breton|creperie)/, 'creperie'],
  [/(steak|grill|meat|barbecue|bbq)/, 'grill'],
  [/(coffee|cake|pastry|dessert|ice_cream|tea|brunch|breakfast)/, 'sucre'],
];

function cuisineOf(t, type) {
  const c = (t.cuisine || '').toLowerCase();
  for (const [re, k] of CUISINE_MAP) if (re.test(c)) return k;
  if (type === 'restaurant') return 'autre';
  return null;
}

// Estimation du prix quand OSM ne le précise pas (1 = pas cher, 2 = moyen, 3 = élevé)
function priceOf(t, type, cuisine) {
  const name = (t.name || '').toLowerCase();
  if (t['michelin:stars'] || t.stars || /gastronom|fine_dining/.test(t.cuisine || '')) return 3;
  if (/(étoilé|gastronomique)/.test(name)) return 3;
  if (type === 'fastfood' || type === 'cafe') return 1;
  if (['burger', 'orientale', 'pizza', 'creperie'].includes(cuisine)) return 1;
  if (type === 'club' || type === 'cocktail') return 2;
  if (type === 'pub' || type === 'bar') return 1 + (/(hotel|rooftop|lounge)/.test(name) ? 1 : 0);
  if (['fruitsdemer', 'japonaise', 'grill'].includes(cuisine)) return 2;
  return 2;
}

function address(t) {
  const n = t['addr:housenumber'], s = t['addr:street'];
  if (!s) return null;
  return (n ? n + ' ' : '') + s;
}

async function venues() {
  const q = `[out:json][timeout:180];
  ( nwr["amenity"~"^(restaurant|fast_food|bar|pub|biergarten|nightclub|cafe)$"]["name"](${B}); );
  out center tags;`;
  const json = await overpass('venues', q);
  const list = [];
  for (const el of json.elements) {
    const t = el.tags || {};
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    if (lat == null || t.disused || t['disused:amenity']) continue;
    const type = classify(t);
    if (!type) continue;
    const cuisine = cuisineOf(t, type);
    const v = {
      id: el.type[0] + el.id,
      n: t.name.trim(),
      la: r5(lat), lo: r5(lon),
      t: type,
    };
    if (cuisine) v.c = cuisine;
    if (t.cuisine) v.cr = t.cuisine.split(';').slice(0, 3).join(', ').replace(/_/g, ' ');
    v.p = priceOf(t, type, cuisine);
    if (t.opening_hours) v.h = t.opening_hours;
    const a = address(t); if (a) v.a = a;
    const phone = t.phone || t['contact:phone']; if (phone) v.ph = phone.split(';')[0].trim();
    const web = t.website || t['contact:website'] || t['contact:instagram'] || t['contact:facebook']; if (web) v.w = web.split(';')[0].trim();
    if (t.outdoor_seating === 'yes') v.ts = 1;
    if (t.wheelchair === 'yes') v.wc = 1;
    if (/yes|only/.test(t['diet:vegetarian'] || '') || /yes|only/.test(t['diet:vegan'] || '')) v.vg = 1;
    if (t.takeaway === 'yes' || t.takeaway === 'only') v.ta = 1;
    if (t.image && /^https?:/.test(t.image)) v.img = t.image;
    else if (t.wikimedia_commons && /^File:/.test(t.wikimedia_commons)) v.img = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(t.wikimedia_commons.slice(5)) + '?width=600';
    if (t.description) v.d = t.description.slice(0, 200);
    list.push(v);
  }
  list.sort((a, b) => a.n.localeCompare(b.n, 'fr'));
  return list;
}

// ---------------------------------------------------------------- Fond de carte
async function basemap() {
  const waterQ = `[out:json][timeout:180];
  ( way["natural"="water"](${B2}); relation["natural"="water"](${B2});
    way["waterway"="riverbank"](${B2}); relation["waterway"="riverbank"](${B2});
    way["waterway"="dock"](${B2}); );
  out geom;`;
  const greenQ = `[out:json][timeout:180];
  ( way["leisure"~"^(park|garden)$"](${B2}); relation["leisure"="park"](${B2});
    way["landuse"~"^(grass|recreation_ground|cemetery)$"](${B2}); way["leisure"="pitch"](${B2}); );
  out geom;`;
  const roadQ = `[out:json][timeout:180];
  ( way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|residential|living_street|pedestrian|unclassified)$"](${B2}); );
  out geom;`;
  const railQ = `[out:json][timeout:120];
  ( way["railway"="rail"]["service"!~"."](${B2}); );
  out geom;`;
  const placeQ = `[out:json][timeout:60];
  ( node["place"~"^(suburb|quarter|neighbourhood)$"](${B}); );
  out;`;

  const water = await overpass('water', waterQ);
  const green = await overpass('green', greenQ);
  const roads = await overpass('roads', roadQ);
  const rail = await overpass('rail', railQ);
  const places = await overpass('places', placeQ);

  const polys = (json, minArea = 0) => {
    const out = [];
    for (const el of json.elements) {
      let rings = [];
      if (el.type === 'way' && el.geometry) {
        const g = el.geometry.map(pt);
        if (g.length > 3 && g[0][0] === g[g.length - 1][0] && g[0][1] === g[g.length - 1][1]) rings = [g];
      } else if (el.type === 'relation') {
        const outers = el.members.filter((m) => m.type === 'way' && m.geometry && m.role !== 'inner').map((m) => m.geometry.map(pt));
        const inners = el.members.filter((m) => m.type === 'way' && m.geometry && m.role === 'inner').map((m) => m.geometry.map(pt));
        rings = assembleRings(outers);
        const holes = assembleRings(inners);
        rings = rings.map((r) => [r]); // polygones avec trous
        for (const h of holes) {
          const c = h[0];
          const host = rings.find((p) => pointInRing(c, p[0]));
          if (host) host.push(h);
        }
        for (const p of rings) {
          const clipped = p.map((r) => simplify(clipRing(r, BB2), 0.00003)).filter((r) => r.length > 3);
          if (clipped.length && clipped[0].length > 3) out.push(clipped);
        }
        continue;
      }
      for (const r of rings) {
        const c = simplify(clipRing(r, BB2), 0.00003);
        if (c.length > 3 && Math.abs(area(c)) >= minArea) out.push([c]);
      }
    }
    return out;
  };

  const roadClass = {
    motorway: 1, trunk: 1, motorway_link: 1, trunk_link: 1,
    primary: 2, primary_link: 2, secondary: 2, secondary_link: 2,
    tertiary: 3, unclassified: 4, residential: 4, living_street: 4, pedestrian: 5,
  };
  const roadOut = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const labels = [];
  const seenNames = new Map();
  for (const el of roads.elements) {
    if (!el.geometry) continue;
    if (el.tags.area === 'yes') continue;
    const k = roadClass[el.tags.highway];
    let g = el.geometry.map(pt);
    g = simplify(g, k <= 2 ? 0.00002 : 0.00003);
    if (g.length < 2) continue;
    roadOut[k].push(g);
    const nm = el.tags.name;
    if (nm && k <= 3 && g.length >= 2) {
      const len = g.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - g[i - 1][0], (p[1] - g[i - 1][1]) * 0.71) : 0), 0);
      const prev = seenNames.get(nm);
      if (!prev || prev.len < len) seenNames.set(nm, { len, g, k });
    }
  }
  for (const [nm, { g, k, len }] of seenNames) {
    if (len < 0.003) continue;
    const mid = g[Math.floor(g.length / 2)], a = g[Math.max(0, Math.floor(g.length / 2) - 1)], b = g[Math.min(g.length - 1, Math.floor(g.length / 2) + 1)];
    let ang = Math.atan2(-(b[0] - a[0]), (b[1] - a[1]) * 0.71) * 180 / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    labels.push([nm, mid[0], mid[1], Math.round(ang), k]);
  }

  const railOut = rail.elements.filter((e) => e.geometry).map((e) => simplify(e.geometry.map(pt), 0.00003));
  const placeOut = places.elements
    .filter((e) => e.tags.name)
    .map((e) => [e.tags.name, r5(e.lat), r5(e.lon), e.tags.place === 'suburb' ? 1 : e.tags.place === 'quarter' ? 2 : 3]);

  return {
    bbox: BB2,
    water: polys(water),
    green: polys(green, 2e-7),
    roads: roadOut,
    rail: railOut,
    labels,
    places: placeOut,
  };
}

function area(r) { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][1] * r[i + 1][0] - r[i + 1][1] * r[i][0]; return s / 2; }
function pointInRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i], [yj, xj] = ring[j];
    if ((yi > p[0]) !== (yj > p[0]) && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------- Tram
async function tram() {
  const q = `[out:json][timeout:180];
  relation["route"="tram"](${B2})->.r;
  .r out body;
  node(r.r);
  out;
  way(r.r);
  out geom;`;
  const json = await overpass('tram', q);
  const nodes = new Map(), ways = new Map(), rels = [];
  for (const el of json.elements) {
    if (el.type === 'node') nodes.set(el.id, el);
    else if (el.type === 'way') ways.set(el.id, el);
    else if (el.type === 'relation') rels.push(el);
  }
  const lines = new Map();
  const stops = new Map(); // nom → {name, la, lo, lines:Set}
  for (const rel of rels) {
    const ref = (rel.tags.ref || (rel.tags.name || '').match(/^Tram ([A-F])\b/)?.[1] || '').toUpperCase();
    if (!/^[A-F]$/.test(ref)) continue;
    const colour = rel.tags.colour || { A: '#81197f', B: '#e2001a', C: '#d6007d', D: '#8f5ca5', E: '#00a0e2', F: '#008d36' }[ref];
    const seq = [];
    for (const m of rel.members) {
      if (m.type !== 'node' || !/stop/.test(m.role)) continue;
      const n = nodes.get(m.ref);
      if (!n) continue;
      const name = (n.tags?.name || '').trim();
      if (!name) continue;
      if (seq.length && seq[seq.length - 1].name === name) continue;
      seq.push({ name, la: r5(n.lat), lo: r5(n.lon) });
    }
    if (seq.length < 2) continue;
    const geom = rel.members.filter((m) => m.type === 'way' && (m.role === '' || m.role === 'forward' || m.role === 'backward'))
      .map((m) => ways.get(m.ref)).filter(Boolean).map((w) => simplify(w.geometry.map(pt), 0.00002));
    if (!lines.has(ref)) lines.set(ref, { ref, colour, variants: [], geom: [] });
    const L = lines.get(ref);
    L.variants.push(seq.map((s) => s.name));
    L.geom.push(...geom);
    for (const s of seq) {
      if (!stops.has(s.name)) stops.set(s.name, { name: s.name, la: s.la, lo: s.lo, lines: new Set() });
      stops.get(s.name).lines.add(ref);
    }
  }
  // dédoublonnage des géométries (aller/retour)
  for (const L of lines.values()) {
    const seen = new Set();
    L.geom = L.geom.filter((g) => { const k = JSON.stringify([g[0], g[g.length - 1]].sort()); if (seen.has(k)) return false; seen.add(k); return true; });
    // variantes uniques
    const vs = new Set();
    L.variants = L.variants.filter((v) => { const k = v.join('|'); const k2 = [...v].reverse().join('|'); if (vs.has(k) || vs.has(k2)) return false; vs.add(k); return true; });
  }
  return {
    lines: [...lines.values()].sort((a, b) => a.ref.localeCompare(b.ref)),
    stops: [...stops.values()].map((s) => ({ ...s, lines: [...s.lines].sort() })),
  };
}

async function hotelLookup() {
  const q = `[out:json][timeout:60];
  ( nwr["tourism"="hotel"]["name"~"ibis",i](44.815,-0.565,44.83,-0.54); );
  out center tags;`;
  const json = await overpass('hotel', q);
  return json.elements.map((e) => ({ name: e.tags.name, la: e.lat ?? e.center?.lat, lo: e.lon ?? e.center?.lon, addr: `${e.tags['addr:housenumber'] || ''} ${e.tags['addr:street'] || ''}`.trim() }));
}

// ---------------------------------------------------------------- Réseau routier (itinéraires)
// Graphe compact : nœuds = carrefours, arêtes = tronçons entre deux carrefours.
// Chaque arête : [a, b, longueur (m), drapeaux, vitesse voiture (km/h), nb points de géométrie]
// Drapeaux : 1 voiture dans le sens a→b, 2 voiture b→a, 4 piéton, 8 escaliers
const GB = { s: 44.798, w: -0.632, n: 44.892, e: -0.512 };
const CAR_KMH = {
  motorway: 75, motorway_link: 45, trunk: 55, trunk_link: 40, primary: 30, primary_link: 25, secondary: 27, secondary_link: 22,
  tertiary: 23, tertiary_link: 20, unclassified: 18, residential: 17, living_street: 8, service: 12,
};
const FOOT_ONLY = new Set(['pedestrian', 'footway', 'path', 'steps', 'cycleway', 'track', 'bridleway', 'corridor']);

async function graph() {
  const q = `[out:json][timeout:240];
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|footway|path|steps|cycleway|track|bridleway|corridor|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"]
     ["area"!="yes"]["service"!~"^(parking_aisle|driveway|drive-through|emergency_access)$"]["footway"!~"^(sidewalk|crossing|traffic_island)$"]
     ["access"!~"^(private|no)$"](${GB.s},${GB.w},${GB.n},${GB.e});
  out body;
  >;
  out skel qt;`;
  const json = await overpass('graph', q);
  const coords = new Map();
  const ways = [];
  for (const el of json.elements) {
    if (el.type === 'node') coords.set(el.id, [el.lat, el.lon]);
    else if (el.type === 'way') ways.push(el);
  }
  // accès par voie
  const info = [];
  const use = new Map();
  for (const w of ways) {
    const t = w.tags || {}, hw = t.highway;
    const carOk = !FOOT_ONLY.has(hw) && !/^(no|private)$/.test(t.motor_vehicle || t.motorcar || t.vehicle || '') &&
      !(/^(no)$/.test(t.access || '') && /yes|designated/.test((t.psv || '') + (t.bus || '')));
    let fwd = carOk, back = carOk;
    const ow = t.oneway || ((t.junction === 'roundabout' || t.junction === 'circular' || /^motorway/.test(hw)) ? 'yes' : 'no');
    if (/^(yes|true|1)$/.test(ow)) back = false;
    else if (ow === '-1') { fwd = false; }
    const footOk = !/^motorway/.test(hw) && !(hw.startsWith('trunk') && t.foot === 'no' && t.sidewalk !== 'separate');
    let kmh = CAR_KMH[hw] || 15;
    const ms = parseInt(t.maxspeed, 10);
    if (ms) kmh = Math.min(kmh, Math.round(ms * 0.65));
    const flags = (fwd ? 1 : 0) | (back ? 2 : 0) | (footOk ? 4 : 0) | (hw === 'steps' ? 8 : 0);
    if (!(flags & 7)) continue;
    info.push({ w, flags, kmh });
    w.nodes.forEach((id, i) => use.set(id, (use.get(id) || 0) + (i === 0 || i === w.nodes.length - 1 ? 2 : 1)));
  }
  const idx = new Map(); const nodes = [];
  const nodeIndex = (id) => { if (!idx.has(id)) { idx.set(id, nodes.length / 2); const [la, lo] = coords.get(id); nodes.push(Math.round(la * 1e5), Math.round(lo * 1e5)); } return idx.get(id); };
  const edges = [], geom = [];
  const R = 6371000, toRad = Math.PI / 180;
  const hav = (a, b) => { const dLa = (b[0] - a[0]) * toRad, dLo = (b[1] - a[1]) * toRad; const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
  for (const { w, flags, kmh } of info) {
    const ids = w.nodes.filter((id) => coords.has(id));
    let start = 0;
    for (let i = 1; i < ids.length; i++) {
      if (i === ids.length - 1 || use.get(ids[i]) > 1) {
        const seg = ids.slice(start, i + 1).map((id) => coords.get(id));
        let len = 0; for (let k = 1; k < seg.length; k++) len += hav(seg[k - 1], seg[k]);
        const inner = simplify(seg, 0.00003).slice(1, -1);
        edges.push(nodeIndex(ids[start]), nodeIndex(ids[i]), Math.max(1, Math.round(len)), flags, kmh, inner.length);
        for (const p of inner) geom.push(Math.round(p[0] * 1e5), Math.round(p[1] * 1e5));
        start = i;
      }
    }
  }
  // coordonnées relatives à une origine pour des nombres plus courts
  const base = [Math.round(GB.s * 1e5), Math.round(GB.w * 1e5)];
  for (let i = 0; i < nodes.length; i += 2) { nodes[i] -= base[0]; nodes[i + 1] -= base[1]; }
  for (let i = 0; i < geom.length; i += 2) { geom[i] -= base[0]; geom[i + 1] -= base[1]; }
  return { base, n: nodes, e: edges, g: geom };
}

async function parkings() {
  const q = `[out:json][timeout:90];
  nwr["amenity"="parking"]["parking"~"^(underground|multi-storey)$"]["access"!~"^(private|customers|no)$"](${GB.s},${GB.w},${GB.n},${GB.e});
  out center tags;`;
  const json = await overpass('parkings', q);
  return json.elements.map((e) => {
    const t = e.tags || {};
    return { n: t.name || 'Parking', la: r5(e.lat ?? e.center.lat), lo: r5(e.lon ?? e.center.lon), cap: +t.capacity || null, h: t.opening_hours || null };
  }).filter((p) => (p.n !== 'Parking' || p.cap > 100) && !/^(accès|acces|entrée|sortie)/i.test(p.n) && !/(dépose|clinique)/i.test(p.n))
    .map((p) => ({ ...p, n: p.n.replace(/^Parking\s+/i, '') }));
}

await mkdir(RAW, { recursive: true });
await mkdir(OUT, { recursive: true });

if (process.argv.includes('--graph-only')) {
  const g = await graph();
  await writeFile(path.join(OUT, 'graph.json'), JSON.stringify(g));
  console.log(`✔ réseau routier : ${g.n.length / 2} carrefours, ${g.e.length / 6} tronçons`);
  const pk = await parkings();
  await writeFile(path.join(OUT, 'parkings.json'), JSON.stringify(pk));
  console.log(`✔ ${pk.length} parkings`);
  process.exit(0);
}

const h = await hotelLookup();
console.log('Hôtels Ibis trouvés :', h);
const v = await venues();
await writeFile(path.join(OUT, 'venues.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), venues: v }));
console.log(`✔ ${v.length} lieux`);
const t = await tram();
await writeFile(path.join(OUT, 'tram.json'), JSON.stringify(t));
console.log(`✔ ${t.lines.length} lignes de tram, ${t.stops.length} arrêts`);
const bm = await basemap();
await writeFile(path.join(OUT, 'basemap.json'), JSON.stringify(bm));
console.log('✔ fond de carte', Object.fromEntries(Object.entries(bm).map(([k, x]) => [k, Array.isArray(x) ? x.length : typeof x === 'object' ? Object.values(x).map((a) => a.length || 0).join('/') : x])));
const g = await graph();
await writeFile(path.join(OUT, 'graph.json'), JSON.stringify(g));
console.log(`✔ réseau routier : ${g.n.length / 2} carrefours, ${g.e.length / 6} tronçons`);
const pk = await parkings();
await writeFile(path.join(OUT, 'parkings.json'), JSON.stringify(pk));
console.log(`✔ ${pk.length} parkings`);
