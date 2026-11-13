// Synchronisation des notes de l'équipe avec Google Sheets (script scripts/google-apps-script/Code.gs).
// - Les notes reçues sont gardées en cache : tout reste consultable hors ligne.
// - Les modifications partent tout de suite ; sans réseau elles attendent et repartent au retour.
// - Les notes des collègues arrivent toutes les minutes (et au retour sur l'app).

import { SYNC_URL } from './config.js';

const K = { cache: 'cb.sync.cache', pending: 'cb.sync.pending', pin: 'cb.sync.pin', name: 'cb.sync.name', url: 'cb.sync.url', last: 'cb.sync.last' };
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* stockage indisponible */ } },
};

let url = SYNC_URL || ls.get(K.url, '');
let pin = ls.get(K.pin, '');
let name = ls.get(K.name, '');
let remote = ls.get(K.cache, {});
let pending = ls.get(K.pending, {});
let lastSync = ls.get(K.last, 0);
let status = !url ? 'off' : !pin ? 'needpin' : 'idle'; // off | needpin | idle | syncing | ok | offline | error | badpin
let busy = false, again = false, timer = null;
const listeners = new Set();

const emit = (changed) => { for (const fn of listeners) fn(changed); };
const savePending = () => ls.set(K.pending, pending);

async function call(body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // évite la requête préalable CORS
    body: JSON.stringify({ ...body, pin, by: name }),
    redirect: 'follow',
  });
  const j = await r.json();
  if (!j.ok) { const e = new Error(j.error || 'erreur'); e.code = j.error; throw e; }
  return j;
}

function setRemote(lieux) {
  const changed = new Set();
  const ids = new Set([...Object.keys(remote), ...Object.keys(lieux)]);
  for (const id of ids) if (JSON.stringify(remote[id]) !== JSON.stringify(lieux[id])) changed.add(id);
  remote = lieux;
  ls.set(K.cache, remote);
  return changed;
}

// Envoie les modifications en attente puis récupère toutes les notes
async function syncNow() {
  if (!url || !pin) return;
  if (busy) { again = true; return; }
  busy = true;
  const sent = pending;
  const hasPending = Object.keys(sent).length > 0;
  pending = {};
  status = 'syncing'; emit(new Set());
  try {
    const j = await call(hasPending ? { action: 'bulk', lieux: sent } : { action: 'list' });
    savePending();
    const changed = setRemote(j.lieux || {});
    lastSync = Date.now(); ls.set(K.last, lastSync);
    status = 'ok';
    emit(changed);
  } catch (e) {
    // on remet les modifications non envoyées dans la file (sans écraser les plus récentes)
    for (const id in sent) pending[id] = { ...sent[id], ...(pending[id] || {}) };
    savePending();
    status = e.code === 'pin' ? 'badpin' : navigator.onLine ? 'error' : 'offline';
    if (status === 'badpin') { pin = ''; ls.del(K.pin); }
    emit(new Set());
  } finally {
    busy = false;
    if (again) { again = false; syncNow(); }
  }
}

function schedule(ms = 1200) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, ms);
}

export const sync = {
  get enabled() { return !!url; },
  get active() { return !!url && !!pin; },
  get status() { return status; },
  get lastSync() { return lastSync; },
  get pendingCount() { return Object.keys(pending).length; },
  get name() { return name; },
  get url() { return url; },
  get fromConfig() { return !!SYNC_URL; },
  get(id) { return { ...(remote[id] || {}), ...(pending[id] || {}) }; },
  ids() { return new Set([...Object.keys(remote), ...Object.keys(pending)]); },
  set(id, patch, nom) {
    pending[id] = { ...(pending[id] || {}), ...patch, nom };
    savePending();
    emit(new Set([id]));
    schedule();
  },
  onChange(fn) { listeners.add(fn); },
  now: syncNow,
  setName(n) { name = String(n || '').trim().slice(0, 40); ls.set(K.name, name); },

  // Connexion avec le code d'équipe ; envoie aussi les notes déjà saisies sur cet appareil
  async connect({ code, who, address, legacy }) {
    if (address !== undefined && !SYNC_URL) { url = String(address).trim(); ls.set(K.url, url); }
    if (!url) return 'nourl';
    pin = String(code || '').trim();
    this.setName(who);
    if (legacy) for (const [id, s] of Object.entries(legacy)) pending[id] = { ...s, ...(pending[id] || {}) };
    savePending();
    await syncNow();
    if (status === 'ok') ls.set(K.pin, pin);
    return status;
  },
  disconnect() {
    pin = ''; ls.del(K.pin);
    status = url ? 'needpin' : 'off';
    emit(new Set(Object.keys(remote)));
  },
};

// Rafraîchissement régulier et au retour sur l'app / du réseau
if (sync.active) setTimeout(syncNow, 300);
setInterval(() => { if (sync.active && document.visibilityState === 'visible') syncNow(); }, 60_000);
document.addEventListener('visibilitychange', () => { if (sync.active && document.visibilityState === 'visible') syncNow(); });
window.addEventListener('online', () => { if (sync.active) syncNow(); });
