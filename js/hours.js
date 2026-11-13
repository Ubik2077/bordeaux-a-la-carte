// Lecture simplifiée du format OpenStreetMap « opening_hours ».
// Couvre l'immense majorité des cas : « Mo-Fr 12:00-14:00,19:00-22:30; Sa 19:00-23:30; Su off »,
// « 24/7 », horaires après minuit (18:00-02:00). Les règles saisonnières sont ignorées
// (le résultat est alors marqué « approx »).

import { CLOSING_SOON_MIN } from './config.js';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DAY_RE = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)';

const cache = new Map();

export function parseHours(raw) {
  if (!raw) return null;
  if (cache.has(raw)) return cache.get(raw);
  const res = parse(raw);
  cache.set(raw, res);
  return res;
}

function parse(raw) {
  const str = raw.replace(/"[^"]*"/g, '').replace(/\s+/g, ' ').trim();
  if (/^24\/7$/.test(str)) return { week: DAYS.map(() => [[0, 1440]]), approx: false, always: true };
  const week = DAYS.map(() => null);
  let approx = false, any = false;
  for (const rule of str.split(/\s*(?:;|\|\|)\s*/).filter(Boolean)) {
    const subs = rule.split(new RegExp(`(?<=\\d|off|closed)\\s*,\\s*(?=${DAY_RE}\\b)`));
    const touched = new Set();
    for (let sub of subs) {
      sub = sub.trim();
      if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|easter|SH)\b/.test(sub)) { approx = true; continue; }
      const m = sub.match(new RegExp(`^((?:${DAY_RE}(?:\\[[^\\]]*\\])?(?:-${DAY_RE})?\\s*,?\\s*)+)(.*)$`));
      let days, rest;
      if (m) {
        if (m[1].includes('[')) approx = true;
        days = parseDays(m[1]);
        rest = m[2].trim();
        if (!days.length) continue; // uniquement jours fériés
      } else { days = [0, 1, 2, 3, 4, 5, 6]; rest = sub; }
      let intervals;
      if (/^open$/i.test(rest)) { intervals = [[0, 1440]]; }
      else if (!rest) { approx = true; continue; }
      else if (/^(off|closed)\b/i.test(rest)) intervals = [];
      else {
        intervals = parseTimes(rest);
        if (!intervals) { approx = true; continue; }
      }
      for (const d of days) {
        if (!touched.has(d)) { week[d] = []; touched.add(d); }
        week[d].push(...intervals);
      }
      any = true;
    }
  }
  if (!any) return null;
  return { week: week.map((d) => (d || []).sort((a, b) => a[0] - b[0])), approx };
}

function parseDays(s) {
  const out = new Set();
  for (const tok of s.replace(/\[[^\]]*\]/g, '').split(/[\s,]+/).filter(Boolean)) {
    const [a, b] = tok.split('-');
    const ia = DAYS.indexOf(a);
    if (ia < 0) continue;
    if (!b) { out.add(ia); continue; }
    const ib = DAYS.indexOf(b);
    if (ib < 0) continue;
    for (let i = ia; ; i = (i + 1) % 7) { out.add(i); if (i === ib) break; }
  }
  return [...out];
}

function toMin(t) {
  const m = t.match(/^(\d{1,2})[:h](\d{2})$/);
  if (!m) return null;
  return +m[1] * 60 + +m[2];
}

function parseTimes(s) {
  const out = [];
  for (const part of s.split(/\s*,\s*/)) {
    const p = part.trim();
    let m = p.match(/^(\d{1,2}[:h]\d{2})\s*-\s*(\d{1,2}[:h]\d{2})\+?$/);
    if (m) {
      const a = toMin(m[1]); let b = toMin(m[2]);
      if (a == null || b == null) return null;
      if (b <= a) b += 1440;
      out.push([a, b]);
      continue;
    }
    m = p.match(/^(\d{1,2}[:h]\d{2})\+$/);
    if (m) { const a = toMin(m[1]); out.push([a, a + 180]); continue; }
    return null;
  }
  return out.length ? out : null;
}

const dayIdx = (d) => (d.getDay() + 6) % 7;

// Statut à un instant donné : open | closing | closed | unknown
export function hoursStatus(raw, at = new Date()) {
  const h = parseHours(raw);
  if (!h) return { state: 'unknown', text: 'Horaires non renseignés' };
  const d = dayIdx(at), min = at.getHours() * 60 + at.getMinutes();
  // intervalles actifs (aujourd'hui, ou débordement de la veille après minuit)
  let closeAt = null;
  for (const [a, b] of h.week[d]) if (min >= a && min < b) closeAt = Math.max(closeAt ?? 0, b);
  const prev = (d + 6) % 7;
  for (const [a, b] of h.week[prev]) if (b > 1440 && min < b - 1440) closeAt = Math.max(closeAt ?? 0, b - 1440);
  if (closeAt != null) {
    // enchaînement : fermeture à minuit puis réouverture à 00:00 le lendemain
    if (closeAt >= 1440) {
      const nxt = h.week[(d + 1) % 7].find(([a]) => a === 0);
      if (nxt) closeAt = 1440 + nxt[1];
    }
    if (h.always || closeAt - min >= 1440) return { state: 'open', text: 'Ouvert 24h/24', approx: h.approx };
    const left = closeAt - min;
    const label = fmt(closeAt % 1440);
    if (left <= CLOSING_SOON_MIN) return { state: 'closing', text: `Ferme bientôt · ${label}`, short: `ferme ${label}`, left, approx: h.approx };
    return { state: 'open', text: `Ouvert · ferme à ${label}`, short: `jusqu'à ${label}`, left, approx: h.approx };
  }
  // prochaine ouverture
  for (let k = 0; k < 7; k++) {
    const day = (d + k) % 7;
    const next = h.week[day].filter(([a]) => k > 0 || a > min).sort((x, y) => x[0] - y[0])[0];
    if (next) {
      const when = k === 0 ? `à ${fmt(next[0])}` : k === 1 ? `demain ${fmt(next[0])}` : `${DAY_NAMES[day]} ${fmt(next[0])}`;
      const inMin = k === 0 ? next[0] - min : null;
      return { state: 'closed', text: `Fermé · ouvre ${when}`, short: `ouvre ${when}`, opensIn: inMin, approx: h.approx };
    }
  }
  return { state: 'closed', text: 'Fermé', short: 'fermé', approx: h.approx };
}

export function fmt(min) {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  return `${h}h${m ? String(m).padStart(2, '0') : ''}`;
}

// Tableau de la semaine pour l'affichage
export function weekTable(raw) {
  const h = parseHours(raw);
  if (!h) return null;
  return h.week.map((iv, i) => ({
    day: DAY_NAMES[i],
    text: iv.length === 1 && iv[0][0] === 0 && iv[0][1] >= 1440 ? '24h/24' : iv.length ? iv.map(([a, b]) => `${fmt(a)} – ${b % 1440 === 0 ? 'minuit' : fmt(b % 1440)}`).join(' · ') : 'Fermé',
    closed: !iv.length,
  }));
}
