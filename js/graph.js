// Moteur d'itinéraires hors ligne sur le réseau routier OpenStreetMap embarqué (data/graph.json).
// Deux profils : « foot » (piéton, coût en mètres) et « car » (voiture, coût en secondes,
// sens uniques et rues piétonnes respectés).

const R = 6371000, RAD = Math.PI / 180;
export function hav(aLa, aLo, bLa, bLo) {
  const dLa = (bLa - aLa) * RAD, dLo = (bLo - aLo) * RAD;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(aLa * RAD) * Math.cos(bLa * RAD) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Tas binaire minimal (clé flottante, valeur entière)
class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(), n = k.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

export class RoadGraph {
  constructor(g) {
    const n = g.n.length / 2;
    this.n = n;
    this.lat = new Float64Array(n); this.lon = new Float64Array(n);
    for (let i = 0; i < n; i++) { this.lat[i] = (g.n[2 * i] + g.base[0]) / 1e5; this.lon[i] = (g.n[2 * i + 1] + g.base[1]) / 1e5; }
    const m = g.e.length / 6;
    this.ea = new Int32Array(m); this.eb = new Int32Array(m); this.elen = new Float32Array(m);
    this.eflags = new Uint8Array(m); this.ekmh = new Uint8Array(m); this.egOff = new Int32Array(m); this.egN = new Uint16Array(m);
    this.gLat = new Float64Array(g.g.length / 2); this.gLon = new Float64Array(g.g.length / 2);
    for (let i = 0; i < g.g.length / 2; i++) { this.gLat[i] = (g.g[2 * i] + g.base[0]) / 1e5; this.gLon[i] = (g.g[2 * i + 1] + g.base[1]) / 1e5; }
    let off = 0;
    for (let i = 0; i < m; i++) {
      const o = 6 * i;
      this.ea[i] = g.e[o]; this.eb[i] = g.e[o + 1]; this.elen[i] = g.e[o + 2]; this.eflags[i] = g.e[o + 3]; this.ekmh[i] = g.e[o + 4];
      this.egOff[i] = off; this.egN[i] = g.e[o + 5]; off += g.e[o + 5];
    }
    this.adj = { foot: this.#build('foot'), car: this.#build('car') };
    this.#grid();
  }

  // Liste d'adjacence compacte (CSR) pour un profil
  #build(mode) {
    const { n, ea, eb, elen, eflags, ekmh } = this;
    const m = ea.length;
    const deg = new Int32Array(n + 1);
    const ok = (i, dir) => (mode === 'foot' ? (eflags[i] & 4) : (eflags[i] & (dir ? 1 : 2)));
    for (let i = 0; i < m; i++) { if (ok(i, 1)) deg[ea[i]]++; if (ok(i, 0)) deg[eb[i]]++; }
    const start = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
    const to = new Int32Array(start[n]), edge = new Int32Array(start[n]), cost = new Float32Array(start[n]);
    const fill = start.slice(0, n);
    const c = (i) => (mode === 'foot' ? elen[i] * ((eflags[i] & 8) ? 1.4 : 1) : elen[i] / (ekmh[i] / 3.6) + 2);
    for (let i = 0; i < m; i++) {
      if (ok(i, 1)) { const p = fill[ea[i]]++; to[p] = eb[i]; edge[p] = i; cost[p] = c(i); }
      if (ok(i, 0)) { const p = fill[eb[i]]++; to[p] = ea[i]; edge[p] = i; cost[p] = c(i); }
    }
    const has = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (start[i + 1] > start[i]) has[i] = 1;
    return { start, to, edge, cost, has };
  }

  // Grille spatiale pour trouver le carrefour le plus proche
  #grid() {
    this.cell = 0.0025;
    this.cells = new Map();
    for (let i = 0; i < this.n; i++) {
      const k = Math.floor(this.lat[i] / this.cell) + ':' + Math.floor(this.lon[i] / this.cell);
      let a = this.cells.get(k); if (!a) this.cells.set(k, (a = [])); a.push(i);
    }
  }

  nearest(la, lo, mode) {
    const has = this.adj[mode].has;
    const ci = Math.floor(la / this.cell), cj = Math.floor(lo / this.cell);
    let best = -1, bd = Infinity;
    for (let r = 0; r <= 4 && best < 0; r++) {
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = this.cells.get((ci + di) + ':' + (cj + dj)); if (!a) continue;
        for (const i of a) {
          if (!has[i]) continue;
          const d = hav(la, lo, this.lat[i], this.lon[i]);
          if (d < bd) { bd = d; best = i; }
        }
      }
    }
    return best < 0 ? null : { node: best, d: bd };
  }

  // Plus courts chemins depuis un nœud vers tous les autres
  tree(mode, src) {
    const { start, to, edge, cost } = this.adj[mode];
    const dist = new Float32Array(this.n).fill(Infinity);
    const len = new Float32Array(this.n);
    const prevE = new Int32Array(this.n).fill(-1);
    const done = new Uint8Array(this.n);
    const h = new Heap();
    dist[src] = 0; h.push(0, src);
    while (h.size) {
      const u = h.pop();
      if (done[u]) continue;
      done[u] = 1;
      for (let p = start[u]; p < start[u + 1]; p++) {
        const v = to[p], nd = dist[u] + cost[p];
        if (nd < dist[v]) { dist[v] = nd; len[v] = len[u] + this.elen[edge[p]]; prevE[v] = edge[p]; h.push(nd, v); }
      }
    }
    return { mode, src, dist, len, prevE };
  }

  // Chemin (coordonnées) depuis la racine d'un arbre jusqu'à un nœud
  treePath(tree, target) {
    if (!isFinite(tree.dist[target])) return null;
    const edges = [];
    let v = target, guard = 0;
    while (v !== tree.src && guard++ < 100000) {
      const e = tree.prevE[v];
      if (e < 0) return null;
      edges.push([e, v]);
      v = this.ea[e] === v ? this.eb[e] : this.ea[e];
    }
    edges.reverse();
    return this.#coords(tree.src, edges);
  }

  // A* entre deux nœuds (pour les trajets à pied à l'arrivée)
  route(mode, s, t) {
    if (s === t) return { cost: 0, len: 0, pts: [[this.lat[s], this.lon[s]]] };
    const { start, to, edge, cost } = this.adj[mode];
    const speed = mode === 'foot' ? 1 : 75 / 3.6;
    const tl = this.lat[t], tlo = this.lon[t];
    const g = new Map(), prev = new Map(), closed = new Set();
    const h = new Heap();
    g.set(s, 0); h.push(hav(this.lat[s], this.lon[s], tl, tlo) / speed, s);
    let iter = 0;
    while (h.size && iter++ < 200000) {
      const u = h.pop();
      if (u === t) break;
      if (closed.has(u)) continue;
      closed.add(u);
      const gu = g.get(u);
      for (let p = start[u]; p < start[u + 1]; p++) {
        const v = to[p], nd = gu + cost[p];
        if (nd < (g.get(v) ?? Infinity)) { g.set(v, nd); prev.set(v, edge[p]); h.push(nd + hav(this.lat[v], this.lon[v], tl, tlo) / speed, v); }
      }
    }
    if (!g.has(t)) return null;
    const edges = [];
    let v = t, len = 0;
    while (v !== s) {
      const e = prev.get(v);
      edges.push([e, v]); len += this.elen[e];
      v = this.ea[e] === v ? this.eb[e] : this.ea[e];
    }
    edges.reverse();
    return { cost: g.get(t), len, pts: this.#coords(s, edges) };
  }

  #coords(src, edges) {
    const pts = [[this.lat[src], this.lon[src]]];
    for (const [e, toNode] of edges) {
      const off = this.egOff[e], k = this.egN[e];
      const forward = this.eb[e] === toNode;
      for (let j = 0; j < k; j++) {
        const q = off + (forward ? j : k - 1 - j);
        pts.push([this.gLat[q], this.gLon[q]]);
      }
      pts.push([this.lat[toNode], this.lon[toNode]]);
    }
    return pts;
  }
}
