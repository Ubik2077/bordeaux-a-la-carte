// Bordeaux à la carte — application principale
import { HOTEL, TYPES, TYPE_FILTERS, DEFAULT_TYPES, CUISINES } from './config.js';
import { hoursStatus, weekTable, parseHours } from './hours.js';
import { initRouting, travelOptions, walkInfo, gmapsUrl, fmtMin } from './routing.js';
import { drawBasemap, setLandmarkLang } from './basemap.js';
import { t, getLang, setLang, applyStatic, fmtMoney, fmtDist, fmtDate } from './i18n.js';
import { sync, fetchPublicNotes } from './sync.js';

const L = window.L;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = () => matchMedia('(max-width: 820px)').matches;

// ------------------------------------------------------------------ Stockage
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};

// Version clients : lien « ?client » (mémorisé sur l'appareil, y compris une fois l'app installée).
// « ?client&apercu » pour un simple aperçu sans changer de mode, « ?reception » pour revenir.
const MODE_KEY = 'cb.mode';
const params = new URLSearchParams(location.search);
if (params.has('reception')) store.set(MODE_KEY, 'staff');
else if (params.has('client') && !params.has('apercu')) store.set(MODE_KEY, 'client');
const CLIENT = params.has('client') || (!params.has('reception') && store.get(MODE_KEY, 'staff') === 'client');
document.documentElement.classList.toggle('mode-client', CLIENT);

// Notes de l'équipe : fichier partagé data/equipe.json + modifications locales
const STAFF_KEY = 'cb.equipe.v1';
let staffShared = {};
let staffLocal = store.get(STAFF_KEY, {});
// Avec la synchronisation active, les notes viennent du tableur Google partagé (voir js/sync.js)
// Les clients ne voient que les coups de cœur, étoiles, prix et lieux masqués (jamais les commentaires)
const PUBLIC_FIELDS = ['fav', 'stars', 'price', 'hidden'];
const pickPublic = (o) => Object.fromEntries(PUBLIC_FIELDS.filter((k) => o && k in o).map((k) => [k, o[k]]));
let publicNotes = CLIENT ? store.get('cb.public.cache', {}) : {};
const staff = (id) => (CLIENT
  ? { ...pickPublic(staffShared[id]), ...pickPublic(publicNotes[id]) }
  : sync.active
    ? { ...(staffShared[id] || {}), ...sync.get(id) }
    : { ...(staffShared[id] || {}), ...(staffLocal[id] || {}) });
function setStaff(id, patch) {
  if (sync.active) { sync.set(id, patch, byId.get(id)?.n); return; }
  staffLocal[id] = { ...(staffLocal[id] || {}), ...patch };
  store.set(STAFF_KEY, staffLocal);
}
const staffIds = () => new Set([...Object.keys(staffShared), ...(sync.active ? sync.ids() : Object.keys(staffLocal))]);
const priceOf = (v) => staff(v.id).price || v.p;
const typeKey = (v) => (v.t === 'cocktail' ? 'bar' : v.t);
const emojiOf = (v) => (v.c && v.c !== 'autre' && CUISINES[v.c] && v.t !== 'cafe' && v.t !== 'bar' ? CUISINES[v.c] : TYPES[v.t].icon);

// ------------------------------------------------------------------ État
const FILTER_KEY = 'cb.filtres.v1';
const saved = store.get(FILTER_KEY, {});
const state = {
  types: new Set(saved.types || DEFAULT_TYPES),
  cuisines: new Set(saved.cuisines || []),
  prices: new Set(saved.prices || []),
  toggles: new Set(saved.toggles || []),
  walkMax: saved.walkMax || 0,
  sort: saved.sort || 'dist',
  q: '',
  when: 'now',
  custom: null,
};
const saveFilters = () => store.set(FILTER_KEY, {
  types: [...state.types], cuisines: [...state.cuisines], prices: [...state.prices], toggles: [...state.toggles], walkMax: state.walkMax, sort: state.sort,
});

let venues = [], byId = new Map(), photos = {}, dataDate = '', nbParkings = 0;
let map, cluster, routeLayer, traveler, travelerRAF, hotelMarker;
let filtered = [];
let selected = null;
let listLimit = 60;

// ------------------------------------------------------------------ Démarrage
if (CLIENT) {
  $('.brand__sub [data-i18n]').dataset.i18n = 'brand.client';
  $('#toggleChips [data-t=fav]').dataset.i18n = 'tg.favClient';
  $('#btnSettings').dataset.i18nTitle = 'help.title';
  $('#btnSettings').textContent = 'ℹ️';
  $('#btnLocate').hidden = false;
}
applyStatic();
init().catch((e) => {
  console.error(e);
  $('#loader .loader__burst').textContent = t('loadError');
});

async function init() {
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
  const [vj, bm, tram, ph, eq, graph, parkings] = await Promise.all([
    get('data/venues.json'), get('data/basemap.json'), get('data/tram.json'), get('data/photos.json'),
    get('data/equipe.json').catch(() => ({})), get('data/graph.json'), get('data/parkings.json'),
  ]);
  photos = ph;
  staffShared = eq.lieux || eq || {};
  dataDate = vj.updated;
  nbParkings = parkings.length;
  initRouting({ graph, tram, parkings });

  venues = vj.venues;
  for (const v of venues) {
    v.walk = walkInfo(v);
    byId.set(v.id, v);
  }
  buildSearchIndex();

  map = L.map('map', {
    zoomControl: false, minZoom: 13, maxZoom: 19, zoomSnap: 1, wheelPxPerZoomLevel: 90,
    maxBounds: [[bm.bbox.s, bm.bbox.w], [bm.bbox.n, bm.bbox.e]], maxBoundsViscosity: 0.9,
    attributionControl: true,
  }).setView([44.8355, -0.5665], 14);
  map.attributionControl.setPrefix(false).addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
  L.control.zoom({ position: 'bottomright', zoomInTitle: t('zoomIn'), zoomOutTitle: t('zoomOut') }).addTo(map);
  drawBasemap(map, bm, tram);
  setLandmarkLang(getLang());

  // Hôtel
  hotelMarker = L.marker([HOTEL.la, HOTEL.lo], { zIndexOffset: 5000, keyboard: false, icon: hotelIcon() })
    .addTo(map).bindTooltip(`${HOTEL.name}<br>${HOTEL.addr}`, { direction: 'bottom', offset: [0, 8] });

  routeLayer = L.layerGroup().addTo(map);

  cluster = L.markerClusterGroup({
    maxClusterRadius: (z) => (z >= 16 ? 30 : 48),
    disableClusteringAtZoom: 17,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    chunkedLoading: true,
    iconCreateFunction: clusterIcon,
  });
  map.addLayer(cluster);
  cluster.on('clustermouseover', (e) => {
    if (!canHover) return;
    const kids = e.layer.getAllChildMarkers();
    const open = kids.filter((m) => /open|closing/.test(m.venue.status.state)).length;
    e.layer.bindTooltip(t('cluster', { n: kids.length, o: open }), { direction: 'top', offset: [0, -18], className: 'cl-tip' }).openTooltip();
  });

  computeStatuses();
  for (const v of venues) createMarker(v);

  buildFilterUI();
  bindUI();
  applyFilters();
  if (CLIENT) {
    // coups de cœur publiés par la réception (tableur Google si configuré)
    fetchPublicNotes().then((lieux) => {
      if (!lieux) return;
      publicNotes = lieux;
      store.set('cb.public.cache', lieux);
      venues.forEach((v) => v.marker.setIcon(pinIcon(v)));
      applyFilters({ keepScroll: true });
    }).catch(() => { /* hors ligne : on garde le cache */ });
  } else {
    sync.onChange(onSyncChange);
    updateSyncDot();
    if (params.has('affiche')) openPoster();
  }

  // Mise à jour des voyants chaque minute
  setInterval(() => { if (state.when === 'now') refreshStatuses(); }, 60_000);

  $('#app').classList.remove('is-loading');
  registerSW();
  setTimeout(() => toast(t('toast.loaded', { n: venues.length, d: fmtDate(dataDate) })), 600);
}

const hotelIcon = () => L.divIcon({ className: 'hotel-pin', iconSize: [0, 0], html: `<div class="h">🏨</div><div class="bubble">${t(CLIENT ? 'hotel.bubbleClient' : 'hotel.bubble')}</div>` });

// Recherche : on indexe les libellés dans les deux langues
function buildSearchIndex() {
  const lang = getLang();
  const labels = (v) => {
    const out = [];
    for (const l of ['fr', 'en']) {
      setLang(l);
      out.push(t('type.' + v.t), v.c ? t('cui.' + v.c) : '');
    }
    return out.join(' ');
  };
  for (const v of venues) v.search = norm(`${v.n} ${labels(v)} ${v.cr || ''} ${v.a || ''}`);
  setLang(lang);
}

// ------------------------------------------------------------------ Langue
function switchLang() {
  setLang(getLang() === 'fr' ? 'en' : 'fr');
  applyStatic();
  buildWalkOptions();
  buildFilterUI();
  setLandmarkLang(getLang());
  hotelMarker.setIcon(hotelIcon());
  $('#hoverCard').hidden = true;
  closeModal();
  refreshStatuses();
  toast(t('toast.lang'));
}

// ------------------------------------------------------------------ Synchronisation des notes
function onSyncChange(changed) {
  updateSyncDot();
  if ($('#syncBox')) renderSyncBox();
  if (!changed.size || !venues.length) return;
  for (const id of changed) { const v = byId.get(id); if (v) v.marker.setIcon(pinIcon(v)); }
  applyFilters({ keepScroll: true });
  // on ne redessine pas la fiche pendant qu'on tape une note
  if (selected && changed.has(selected.id) && document.activeElement?.id !== 'staffNote') renderDetail(selected, { keepRoute: true });
}
function updateSyncDot() {
  const btn = $('#btnSettings');
  const st = sync.status;
  btn.dataset.sync = !sync.enabled ? '' : sync.pendingCount && st !== 'syncing' ? 'pending'
    : st === 'ok' || st === 'syncing' || st === 'idle' ? 'ok' : st === 'needpin' ? 'pin' : 'error';
}
function syncStateText() {
  const st = sync.status;
  if (st === 'needpin' || st === 'badpin') return t(st === 'badpin' ? 'sy.badpin' : 'sy.needpin');
  if (st === 'syncing') return t('sy.syncing');
  if (st === 'offline') return t('sy.offline', { n: sync.pendingCount });
  if (st === 'error') return t('sy.error', { n: sync.pendingCount });
  const ago = sync.lastSync ? Math.max(0, Math.round((Date.now() - sync.lastSync) / 60000)) : null;
  return t('sy.ok', { ago: ago == null ? '—' : ago < 1 ? t('sy.justNow') : t('sy.minAgo', { n: ago }) });
}
function renderSyncBox() {
  const box = $('#syncBox');
  if (!box) return;
  if (sync.active) {
    box.innerHTML = `
      <p class="sync-state s-${sync.status}">${syncStateText()}</p>
      <label class="field">${t('sy.name')} <input id="syName" value="${esc(sync.name)}" placeholder="${t('sy.namePh')}"></label>
      <div class="row">
        <button class="btn" id="syNow">${t('sy.now')}</button>
        <button class="btn btn--ghost" id="syOff">${t('sy.disconnect')}</button>
      </div>`;
    $('#syNow').onclick = () => sync.now();
    $('#syOff').onclick = () => { sync.disconnect(); venues.forEach((v) => v.marker.setIcon(pinIcon(v))); applyFilters(); renderSyncBox(); };
    $('#syName').onchange = (e) => sync.setName(e.target.value);
  } else {
    box.innerHTML = `
      <p>${sync.enabled ? t('sy.intro') : t('sy.introNoUrl')}</p>
      ${sync.status === 'badpin' ? `<p class="sync-state s-error">${t('sy.badpin')}</p>` : ''}
      ${sync.fromConfig ? '' : `<label class="field">${t('sy.url')} <input id="syUrl" value="${esc(sync.url)}" placeholder="https://script.google.com/macros/s/…/exec"></label>`}
      <label class="field">${t('sy.code')} <input id="syCode" type="password" autocomplete="off"></label>
      <label class="field">${t('sy.name')} <input id="syName" value="${esc(sync.name)}" placeholder="${t('sy.namePh')}"></label>
      <div class="row"><button class="btn btn--pop" id="syGo">${t('sy.connect')}</button></div>`;
    $('#syGo').onclick = async () => {
      const b = $('#syGo'); b.disabled = true; b.textContent = t('sy.syncing');
      const res = await sync.connect({ code: $('#syCode').value, who: $('#syName').value, address: $('#syUrl')?.value, legacy: staffLocal });
      if (res === 'ok') {
        const n = Object.keys(staffLocal).length;
        staffLocal = {}; store.set(STAFF_KEY, staffLocal); // désormais dans le tableur partagé
        venues.forEach((v) => v.marker.setIcon(pinIcon(v)));
        applyFilters();
        toast(n ? t('sy.connectedUp', { n }) : t('sy.connected'));
      } else if (res === 'nourl') toast(t('sy.needUrl'));
      else if (res !== 'badpin') toast(t('sy.fail'));
      renderSyncBox();
    };
  }
}

// ------------------------------------------------------------------ Statuts
function statusDate() {
  if (state.when === 'now') return new Date();
  if (state.when === 'custom' && state.custom) return state.custom;
  const d = new Date();
  const h = { midi: [12, 30], soir: [20, 0], tard: [23, 0] }[state.when] || [d.getHours(), d.getMinutes()];
  d.setHours(h[0], h[1], 0, 0);
  return d;
}
function computeStatuses() {
  const at = statusDate();
  for (const v of venues) v.status = hoursStatus(v.h, at);
}
function refreshStatuses() {
  const before = new Map(venues.map((v) => [v.id, v.status.state]));
  computeStatuses();
  for (const v of venues) if (before.get(v.id) !== v.status.state) v.marker.setIcon(pinIcon(v));
  applyFilters({ keepScroll: true });
  if (selected) renderDetail(selected, { keepRoute: true });
  const b = $('#whenBanner');
  if (state.when === 'now') b.hidden = true;
  else {
    const d = statusDate();
    b.hidden = false;
    b.textContent = t('banner', { d: t('days')[(d.getDay() + 6) % 7], t: getLang() === 'en' ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}` });
  }
}

// ------------------------------------------------------------------ Marqueurs
function pinIcon(v) {
  const s = staff(v.id);
  return L.divIcon({
    className: 'pin-wrap' + (selected === v ? ' selected' : ''),
    iconSize: [38, 44], iconAnchor: [19, 40],
    html: `<div class="pin" style="--c:${TYPES[v.t].color}"><span class="pin__burst"></span><span class="pin__body"><span>${emojiOf(v)}</span></span><i class="light light--${v.status.state}"></i>${s.fav ? '<b class="pin__heart">❤</b>' : ''}</div>`,
  });
}

function createMarker(v) {
  const m = L.marker([v.la, v.lo], { icon: pinIcon(v), keyboard: false, riseOnHover: true });
  m.venue = v;
  v.marker = m;
  m.on('click', () => openDetail(v));
  if (canHover) {
    m.on('mouseover', () => showHover(v));
    m.on('mouseout', hideHover);
  }
}

function clusterIcon(c) {
  const kids = c.getAllChildMarkers();
  const n = kids.length;
  const open = kids.reduce((s, m) => s + (/open|closing/.test(m.venue.status.state) ? 1 : 0), 0);
  const size = n < 10 ? 40 : n < 50 ? 50 : n < 150 ? 58 : 66;
  const cls = n < 10 ? 'sm' : n < 100 ? 'md' : 'lg';
  return L.divIcon({
    className: 'cluster-wrap', iconSize: [size, size],
    html: `<div class="cluster ${cls}"><b>${n}</b>${open ? `<i>${open}</i>` : ''}</div>`,
  });
}

function markerEl(v) {
  const parent = cluster.getVisibleParent(v.marker);
  return parent === v.marker ? v.marker.getElement() : null;
}

// ------------------------------------------------------------------ Bulle de survol
let hoverTimer;
function showHover(v) {
  clearTimeout(hoverTimer);
  const card = $('#hoverCard');
  const T = TYPES[v.t];
  const s = staff(v.id);
  const ph = photoOf(v);
  const tr = travelOptions(v);
  const quick = tr.opts.filter((o) => o.mode === 'walk' || o.mode === 'tram' || o.mode === 'bike').slice(0, 3)
    .map((o) => `<span>${o.icon} ${fmtMin(o.min)}</span>`).join('');
  card.style.setProperty('--c', T.color);
  card.innerHTML = `
    <div class="hc__photo" style="background-image:url('${ph.src}')"><span class="hc__type" style="--c:${T.color}">${emojiOf(v)} ${esc(typeLabel(v))}</span></div>
    <div class="hc__body">
      <div class="hc__name">${s.fav ? '❤️ ' : ''}${esc(v.n)}</div>
      <div class="hc__row">${priceHtml(priceOf(v))}<span class="sep">|</span>${starsHtml(s.stars)}</div>
      <div class="hc__row st--${v.status.state}"><i class="light light--${v.status.state}"></i>${esc(v.status.text)}</div>
      <div class="hc__travel">${quick}</div>
      <div class="hc__hint">${t('hover.hint')}</div>
    </div>`;
  card.hidden = false;
  card.classList.remove('below');
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  const p = map.latLngToContainerPoint([v.la, v.lo]);
  const wrap = $('#mapWrap').getBoundingClientRect();
  const w = card.offsetWidth, h = card.offsetHeight;
  let left = p.x - w / 2;
  left = Math.max(10, Math.min(wrap.width - w - 10, left));
  let top = p.y - h - 58;
  if (top < 10) { top = p.y + 18; card.classList.add('below'); }
  card.style.left = left + 'px';
  card.style.top = top + 'px';
  card.style.setProperty('--tail', Math.max(24, Math.min(w - 24, p.x - left)) + 'px');
}
function hideHover() {
  hoverTimer = setTimeout(() => { $('#hoverCard').hidden = true; }, 80);
}

// ------------------------------------------------------------------ Filtres
function passes(v, ignoreType = false) {
  const s = staff(v.id);
  if (s.hidden) return false;
  if (!ignoreType && !state.types.has(typeKey(v))) return false;
  if (state.cuisines.size && !state.cuisines.has(v.c)) return false;
  if (state.prices.size && !state.prices.has(priceOf(v))) return false;
  if (state.walkMax && v.walk.min > state.walkMax) return false;
  const tg = state.toggles;
  if (tg.has('open') && !/open|closing/.test(v.status.state)) return false;
  if (tg.has('fav') && !s.fav) return false;
  if (tg.has('ts') && !v.ts) return false;
  if (tg.has('vg') && !v.vg && v.c !== 'vege') return false;
  if (tg.has('wc') && !v.wc) return false;
  if (state.q) {
    for (const tok of state.q.split(/\s+/)) if (tok && !v.search.includes(tok) && !norm(s.note).includes(tok)) return false;
  }
  return true;
}

function applyFilters({ keepScroll = false } = {}) {
  filtered = venues.filter((v) => passes(v));
  sortList();
  cluster.clearLayers();
  cluster.addLayers(filtered.filter((v) => v !== selected).map((v) => v.marker));
  const counts = {};
  for (const v of venues) if (passes(v, true)) counts[typeKey(v)] = (counts[typeKey(v)] || 0) + 1;
  for (const b of $$('#typeChips .chip')) b.querySelector('.n').textContent = counts[b.dataset.type] || 0;
  $('#count').textContent = filtered.length === 0 ? t('count.0') : filtered.length === 1 ? t('count.1') : t('count.n', { n: filtered.length });
  if (!keepScroll) { listLimit = 60; $('#list').scrollTop = 0; }
  renderList(!keepScroll);
  saveFilters();
}

function sortList() {
  const rank = { open: 0, closing: 1, unknown: 2, closed: 3 };
  const by = {
    dist: (a, b) => a.walk.d - b.walk.d,
    name: (a, b) => a.n.localeCompare(b.n, 'fr'),
    open: (a, b) => rank[a.status.state] - rank[b.status.state] || a.walk.d - b.walk.d,
    stars: (a, b) => (staff(b.id).stars || 0) - (staff(a.id).stars || 0) || (staff(b.id).fav ? 1 : 0) - (staff(a.id).fav ? 1 : 0) || a.walk.d - b.walk.d,
  }[state.sort];
  filtered.sort(by);
}

function renderList(animate = true) {
  const ul = $('#list');
  if (!filtered.length) {
    ul.innerHTML = `<li class="empty">${t('empty')}</li>`;
    return;
  }
  const items = filtered.slice(0, listLimit).map((v, i) => {
    const s = staff(v.id);
    const T = TYPES[v.t];
    return `<li class="item${selected === v ? ' selected' : ''}" data-id="${v.id}" style="--c:${T.color};${animate ? `--i:${Math.min(i, 20)}` : 'animation:none'}">
      <span class="item__icon">${emojiOf(v)}<i class="light light--${v.status.state}"></i></span>
      <div class="item__main">
        <b>${s.fav ? '<span class="item__fav">❤</span> ' : ''}${esc(v.n)}</b>
        <small>${esc(typeLabel(v))}${v.a ? ' · ' + esc(v.a) : ''}</small>
        <small class="st--${v.status.state}">${esc(v.status.short || v.status.text)}</small>
      </div>
      <div class="item__side">${priceHtml(priceOf(v))}<span>🚶 ${fmtMin(v.walk.min)}</span>${s.stars ? starsHtml(s.stars) : ''}</div>
    </li>`;
  });
  if (filtered.length > listLimit) items.push(`<li><button class="btn btn--small more" id="moreBtn">${t('more', { n: filtered.length - listLimit })}</button></li>`);
  ul.innerHTML = items.join('');
}

function typeLabel(v) {
  const base = t('type.' + v.t);
  if ((v.t === 'restaurant' || v.t === 'fastfood') && v.c && v.c !== 'autre') return `${base} · ${t('cui.' + v.c)}`;
  return base;
}
function priceHtml(p) { return `<span class="price" title="${t('price.' + p)} (${t('priceHint.' + p)})">${'€'.repeat(p)}<em>${'€'.repeat(3 - p)}</em></span>`; }
function starsHtml(n) { return n ? `<span class="stars" title="${t('stars.title', { n })}">${'★'.repeat(n)}<em>${'★'.repeat(5 - n)}</em></span>` : `<span class="stars" title="${t('stars.none')}"><em>★★★★★</em></span>`; }
function photoOf(v) {
  if (v.img && navigator.onLine) return { src: v.img, author: 'OpenStreetMap / Wikimedia', license: '', page: v.img, own: true };
  return photos[v.c] || photos[v.t === 'cocktail' ? 'bar' : v.t] || photos.autre;
}

// ------------------------------------------------------------------ Interface filtres
function buildWalkOptions() {
  const cur = String(state.walkMax);
  $('#walkMax').innerHTML = [0, 10, 15, 20, 30].map((n) =>
    `<option value="${n}">${n === 0 ? t('walk.0') : n === 10 ? t('walk.10') : t('walk.n', { n })}</option>`).join('');
  $('#walkMax').value = cur;
}
function buildFilterUI() {
  $('#typeChips').innerHTML = TYPE_FILTERS.map((k) =>
    `<button class="chip${state.types.has(k) ? ' on' : ''}" data-type="${k}" style="--c:${TYPES[k].color}">${TYPES[k].icon} ${t('types.' + k)} <span class="n"></span></button>`).join('');
  $('#cuisineChips').innerHTML = Object.entries(CUISINES).map(([k, icon]) =>
    `<button class="chip${state.cuisines.has(k) ? ' on' : ''}" data-cuisine="${k}">${icon} ${t('cui.' + k)}</button>`).join('');
  updateCuisineVisibility();
  for (const b of $$('#priceSeg button')) b.classList.toggle('on', state.prices.has(+b.dataset.p));
  for (const b of $$('#toggleChips button')) b.classList.toggle('on', state.toggles.has(b.dataset.t));
  if (!$('#walkMax').options.length) buildWalkOptions();
  $('#walkMax').value = String(state.walkMax);
  $('#sort').value = state.sort;
}
function updateCuisineVisibility() {
  $('#cuisineChips').classList.toggle('show', state.types.has('restaurant') || state.types.has('fastfood'));
}
const toggleSet = (set, k) => (set.has(k) ? set.delete(k) : set.add(k));
const pop = (el) => { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };

function bindUI() {
  $('#langBtn').addEventListener('click', switchLang);
  $('#typeChips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    toggleSet(state.types, b.dataset.type);
    b.classList.toggle('on'); pop(b);
    updateCuisineVisibility();
    applyFilters();
  });
  $('#typeChips').addEventListener('dblclick', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.types = new Set([b.dataset.type]);
    buildFilterUI(); applyFilters();
    toast(t('toast.only', { x: t('types.' + b.dataset.type) }));
  });
  $('#cuisineChips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    toggleSet(state.cuisines, b.dataset.cuisine);
    b.classList.toggle('on'); pop(b);
    applyFilters();
  });
  $('#priceSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    toggleSet(state.prices, +b.dataset.p); b.classList.toggle('on');
    applyFilters();
  });
  $('#toggleChips').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    toggleSet(state.toggles, b.dataset.t); b.classList.toggle('on'); pop(b);
    applyFilters();
  });
  $('#walkMax').addEventListener('change', (e) => { state.walkMax = +e.target.value; applyFilters(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; applyFilters(); });
  $('#resetBtn').addEventListener('click', () => {
    state.types = new Set(DEFAULT_TYPES); state.cuisines.clear(); state.prices.clear(); state.toggles.clear();
    state.walkMax = 0; state.q = ''; $('#q').value = ''; $('#clearQ').hidden = true;
    buildFilterUI(); applyFilters(); toast(t('toast.reset'));
  });

  let qTimer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(qTimer);
    $('#clearQ').hidden = !e.target.value;
    qTimer = setTimeout(() => { state.q = norm(e.target.value.trim()); applyFilters(); }, 140);
  });
  $('#q').addEventListener('focus', () => { if (isMobile()) $('#panel').classList.add('expanded'); });
  $('#clearQ').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#clearQ').hidden = true; applyFilters(); $('#q').focus(); });

  $('#when').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.when = b.dataset.when;
    $$('#when button').forEach((x) => x.classList.toggle('on', x === b));
    $('.when__custom').classList.remove('on');
    refreshStatuses();
  });
  $('#whenCustom').addEventListener('change', (e) => {
    if (!e.target.value) return;
    state.when = 'custom'; state.custom = new Date(e.target.value);
    $$('#when button').forEach((x) => x.classList.remove('on'));
    $('.when__custom').classList.add('on');
    refreshStatuses();
  });

  const list = $('#list');
  list.addEventListener('click', (e) => {
    if (e.target.id === 'moreBtn') { listLimit += 80; renderList(false); return; }
    const li = e.target.closest('.item'); if (!li) return;
    openDetail(byId.get(li.dataset.id));
  });
  list.addEventListener('scroll', () => {
    if (list.scrollTop + list.clientHeight > list.scrollHeight - 200 && filtered.length > listLimit) { listLimit += 80; renderList(false); }
  });
  if (canHover) {
    list.addEventListener('mouseover', (e) => {
      const li = e.target.closest('.item'); if (!li) return;
      $$('.pin-wrap.hot').forEach((x) => x.classList.remove('hot'));
      const el = markerEl(byId.get(li.dataset.id));
      if (el) el.classList.add('hot');
    });
    list.addEventListener('mouseleave', () => $$('.pin-wrap.hot').forEach((x) => x.classList.remove('hot')));
  }

  $('#sheetHandle').addEventListener('click', () => $('#panel').classList.toggle('expanded'));
  $('#btnHotel').addEventListener('click', () => map.flyTo([HOTEL.la, HOTEL.lo], 16, { duration: 0.8 }));
  $('#btnRandom').addEventListener('click', surprise);
  $('#btnSettings').addEventListener('click', CLIENT ? openClientHelp : openSettings);
  $('#btnLocate').addEventListener('click', toggleLocate);
  map.on('movestart zoomstart', () => { $('#hoverCard').hidden = true; });
  map.on('click', () => { if (isMobile()) $('#panel').classList.remove('expanded'); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) closeModal();
      else if (selected) closeDetail();
    }
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); $('#q').focus(); }
  });
  $('#modal').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });

  window.addEventListener('online', () => toast(t('toast.online')));
  window.addEventListener('offline', () => toast(t('toast.offline')));
}

// ------------------------------------------------------------------ Fiche détaillée
function openDetail(v) {
  const prev = selected;
  selected = v;
  if (prev && prev !== v) unpin(prev);
  // le lieu sélectionné sort des grappes pour rester toujours visible
  cluster.removeLayer(v.marker);
  v.marker.setIcon(pinIcon(v));
  v.marker.setZIndexOffset(3000);
  v.marker.addTo(map);
  $('#hoverCard').hidden = true;
  renderDetail(v);
  $('#detail').classList.add('open');
  $('#detail').setAttribute('aria-hidden', 'false');
  $('#detail').scrollTop = 0;
  if (isMobile()) $('#panel').classList.remove('expanded');
  $$('#list .item').forEach((li) => li.classList.toggle('selected', li.dataset.id === v.id));
}

function unpin(v) {
  map.removeLayer(v.marker);
  v.marker.setZIndexOffset(0);
  v.marker.setIcon(pinIcon(v));
  if (filtered.includes(v)) cluster.addLayer(v.marker);
}

function closeDetail() {
  const v = selected;
  selected = null;
  if (v) unpin(v);
  $('#detail').classList.remove('open');
  $('#detail').setAttribute('aria-hidden', 'true');
  clearRoute();
  $$('#list .item.selected').forEach((li) => li.classList.remove('selected'));
}

// Textes d'une option de trajet
function modeDetail(o) {
  switch (o.mode) {
    case 'walk': return t('t.walk', { d: fmtDist(o.m) });
    case 'tram': return t('t.tram', { a: Math.round(o.walkStart), b: Math.round(o.walkEnd) });
    case 'bike': return t('t.bike', { d: fmtDist(o.m) });
    case 'taxi': return t('t.taxi', { d: fmtDist(o.m) });
    case 'car': return o.parking ? t('t.carPark', { p: esc(o.parking), m: Math.max(1, Math.round(o.walkEnd)) }) : t('t.carStreet');
    default: return '';
  }
}
const modeCost = (o) => (o.mode === 'car' ? t('perHour', { x: fmtMoney(o.perHour).replace('≈ ', '') }) : fmtMoney(o.cost));

function renderDetail(v, { keepRoute = false } = {}) {
  const T = TYPES[v.t];
  const s = staff(v.id);
  const ph = photoOf(v);
  const tr = travelOptions(v, { paths: true });
  const current = keepRoute && $('#detail .tcard.on')?.dataset.mode;
  const def = (current && tr.opts.find((o) => o.mode === current)?.mode) || (tr.opts.find((o) => o.mode === 'tram' && o.min < tr.opts[0].min - 5) || tr.opts[0]).mode;
  const week = weekTable(v.h);
  const today = (statusDate().getDay() + 6) % 7;
  const parsed = parseHours(v.h);
  const p = priceOf(v);
  const osmUrl = `https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[v.id[0]]}/${v.id.slice(1)}`;

  $('#detail').innerHTML = `
    <div class="detail__bar"><button class="btn btn--round detail__close" id="closeDetail" title="${t('d.close')}">✕</button></div>
    <div class="detail__photo" style="--c:${T.color};background-image:url('${esc(ph.src)}')">
      <a class="credit" href="${esc(ph.page)}" target="_blank" rel="noopener">📷 ${ph.own ? t('d.photoOwn') : t('d.photoIllu')} · ${esc(ph.author)}${ph.license ? ' · ' + esc(ph.license) : ''}</a>
      <div class="detail__tag"><span class="burst-tag" style="--c:${T.color}">${emojiOf(v)} ${esc(typeLabel(v))}</span></div>
    </div>
    <div class="detail__body">
      <h2 class="detail__name">${esc(v.n)}</h2>
      <div class="detail__meta">
        ${priceHtml(p)} <span><b>${t('price.' + p)}</b> · ${t('priceHint.' + p)}${s.price ? t('d.priceStaff') : t('d.priceEst')}</span>
      </div>
      <div class="status-pill s-${v.status.state}"><i class="light light--${v.status.state}"></i>${esc(v.status.text)}${v.status.approx ? ` <small>${t('d.approx')}</small>` : ''}</div>
      ${CLIENT ? (s.fav || s.stars ? `<div class="pick">❤️ ${t('d.pick')} ${s.stars ? starsHtml(s.stars) : ''}</div>` : '') : `<div class="rate-row">
        <span class="star-input" id="starInput" title="${t('d.rateTitle')}">${[1, 2, 3, 4, 5].map((i) => `<button data-s="${i}" class="${i <= (s.stars || 0) ? 'on' : ''}" aria-label="${t('d.star', { n: i })}">★</button>`).join('')}</span>
        <button class="btn btn--small fav-btn${s.fav ? ' on' : ''}" id="favBtn"><span>❤</span> ${s.fav ? t('d.favOn') : t('d.favOff')}</button>
      </div>`}
      ${!CLIENT && s.note ? `<div class="tip" style="background:#fff3b0">${esc(s.note)}</div>` : ''}

      <h3>${t('d.go')}</h3>
      <div class="tip">${t('tip.' + tr.tip)}</div>
      <div class="travel" id="travel">
        ${tr.opts.map((o) => `
          <button class="tcard${o.mode === def ? ' on' : ''}" data-mode="${o.mode}">
            <span class="tcard__icon">${o.icon}</span>
            <span class="tcard__label">${t('m.' + o.mode)}</span>
            <span class="tcard__time">${fmtMin(o.min)}</span>
            <span class="tcard__sub">${modeDetail(o)}</span>
            <span class="tcard__cost">${modeCost(o)}</span>
            ${o.legs ? `<span class="legs">${o.legs.map((l) => `<span><span class="line-pill" style="--c:${l.colour}">${l.line}</span> ${esc(l.from)} → ${esc(l.to)} <small>(${t(l.n > 1 ? 't.stopN' : 't.stop1', { n: l.n })})</small></span>`).join('')}</span>` : ''}
            ${o.fastest || o.cheapest ? `<span class="tcard__badges">${o.fastest ? `<span class="badge">${t('b.fast')}</span>` : ''}${o.cheapest ? `<span class="badge badge--cheap">${t('b.cheap')}</span>` : ''}</span>` : ''}
          </button>`).join('')}
      </div>
      <p class="estim">${t('d.estim')}</p>
      <div class="actions">
        ${CLIENT
    ? `<a class="btn btn--pop" id="gmapsBtn" href="${gmapsUrl(v, tr.opts.find((o) => o.mode === def))}" target="_blank" rel="noopener">${t('d.gmapsGo')}</a>
           <button class="btn" id="shareBtn">${t('d.share')}</button>`
    : `<button class="btn btn--pop" id="qrBtn">${t('d.qr')}</button>
           <a class="btn" id="gmapsBtn" href="${gmapsUrl(v, tr.opts.find((o) => o.mode === def))}" target="_blank" rel="noopener">${t('d.gmaps')}</a>`}
      </div>

      <h3>${t('d.hours')}</h3>
      ${week ? `<table class="hours">${week.map((d, i) => `<tr class="${i === today ? 'today' : ''}${d.closed ? ' closed' : ''}"><td>${d.day}</td><td>${d.text}</td></tr>`).join('')}</table>
        ${parsed?.approx ? `<p class="raw">${t('d.hoursComplex')}</p>` : ''}
        <p class="raw">${t('d.hoursSrc', { x: esc(v.h) })}</p>` : `<p>${t('d.hoursNone')}</p>`}

      <h3>${t('d.info')}</h3>
      <ul class="infos">
        ${v.a ? `<li>📍 <span>${t('d.city', { a: esc(v.a) })}</span></li>` : ''}
        ${v.ph ? `<li>📞 <a href="tel:${esc(v.ph.replace(/\s/g, ''))}">${esc(v.ph)}</a></li>` : ''}
        ${v.w ? `<li>🌐 <a href="${esc(/^https?:/.test(v.w) ? v.w : 'https://' + v.w)}" target="_blank" rel="noopener">${esc(v.w.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></li>` : ''}
        ${v.cr ? `<li>🍴 <span>${t('d.cuisine', { x: esc(v.cr) })}</span></li>` : ''}
        ${v.d ? `<li>📝 <span>${esc(v.d)}</span></li>` : ''}
      </ul>
      <div class="tags">
        ${v.ts ? `<span class="tag">${t('tag.ts')}</span>` : ''}${v.vg ? `<span class="tag">${t('tag.vg')}</span>` : ''}${v.wc ? `<span class="tag">${t('tag.wc')}</span>` : ''}${v.ta ? `<span class="tag">${t('tag.ta')}</span>` : ''}
      </div>

      ${CLIENT ? '' : `<h3>${t('d.staff')}</h3>
      <div class="staff">
        <label>${t('d.staffPrice')}
          <span class="seg" id="staffPrice">${[1, 2, 3].map((i) => `<button data-p="${i}" class="${s.price === i ? 'on' : ''}">${'€'.repeat(i)}</button>`).join('')}</span>
        </label>
        <textarea id="staffNote" placeholder="${esc(t('d.staffPh'))}">${esc(s.note || '')}</textarea>
        <label><input type="checkbox" id="staffHidden" ${s.hidden ? 'checked' : ''}> ${t('d.staffHide')}</label>
        ${sync.active ? `<p class="raw">${s.at ? t('sy.lastEdit', { by: esc(s.by || '?'), d: new Date(s.at).toLocaleString(getLang() === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }) : ''} ${t('sy.shared')}</p>` : ''}
      </div>`}
      <p class="src">${t('d.src', { u: osmUrl })}</p>
    </div>`;

  $('#closeDetail').onclick = closeDetail;
  $('#travel').onclick = (e) => {
    const b = e.target.closest('.tcard'); if (!b) return;
    $$('#travel .tcard').forEach((x) => x.classList.toggle('on', x === b));
    const o = tr.opts.find((x) => x.mode === b.dataset.mode);
    $('#gmapsBtn').href = gmapsUrl(v, o);
    drawRoute(v, o, true);
  };
  if (CLIENT) {
    $('#shareBtn').onclick = () => shareVenue(v, tr.opts.find((o) => o.mode === ($('#detail .tcard.on')?.dataset.mode || def)));
    if (!keepRoute) drawRoute(v, tr.opts.find((o) => o.mode === def), true);
    return;
  }
  $('#qrBtn').onclick = () => openQR(v, tr, $('#detail .tcard.on')?.dataset.mode || def);
  $('#starInput').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const n = +b.dataset.s;
    setStaff(v.id, { stars: staff(v.id).stars === n ? 0 : n });
    afterStaffChange(v);
    toast(staff(v.id).stars ? t('toast.rated', { n }) : t('toast.unrated'));
  };
  $('#favBtn').onclick = () => {
    setStaff(v.id, { fav: !staff(v.id).fav });
    afterStaffChange(v);
    toast(staff(v.id).fav ? t('toast.favOn') : t('toast.favOff'));
  };
  $('#staffPrice').onclick = (e) => {
    e.preventDefault();
    const b = e.target.closest('button'); if (!b) return;
    const n = +b.dataset.p;
    setStaff(v.id, { price: staff(v.id).price === n ? 0 : n });
    afterStaffChange(v);
  };
  let noteTimer;
  $('#staffNote').oninput = (e) => {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { setStaff(v.id, { note: e.target.value.trim() }); applyFilters({ keepScroll: true }); }, 400);
  };
  $('#staffHidden').onchange = (e) => {
    setStaff(v.id, { hidden: e.target.checked });
    applyFilters({ keepScroll: true });
    toast(e.target.checked ? t('toast.hideOn') : t('toast.hideOff'));
  };

  if (!keepRoute) drawRoute(v, tr.opts.find((o) => o.mode === def), true);
}

function afterStaffChange(v) {
  v.marker.setIcon(pinIcon(v));
  renderDetail(v, { keepRoute: true });
  applyFilters({ keepScroll: true });
}

// ------------------------------------------------------------------ Itinéraire sur la carte
const svgRenderer = L.svg({ padding: 0.5 });
const ROUTE_COLORS = { walk: '#1b1b1b', bike: '#1d8a2c', taxi: '#e0a100', car: '#2b6cff' };
function clearRoute() {
  routeLayer.clearLayers();
  cancelAnimationFrame(travelerRAF);
  if (traveler) { traveler.remove(); traveler = null; }
}
function drawRoute(v, o, fit) {
  clearRoute();
  const all = [];
  for (const seg of o.path) {
    all.push(...seg.pts);
    if (seg.kind === 'tram') {
      L.polyline(seg.pts, { renderer: svgRenderer, color: '#1b1b1b', weight: 11, opacity: 1, interactive: false }).addTo(routeLayer);
      L.polyline(seg.pts, { renderer: svgRenderer, color: seg.colour, weight: 6, opacity: 1, interactive: false }).addTo(routeLayer);
      for (const p of seg.pts) L.circleMarker(p, { renderer: svgRenderer, radius: 4, color: '#1b1b1b', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(routeLayer);
    } else if (seg.kind === 'car' || seg.kind === 'taxi') {
      L.polyline(seg.pts, { renderer: svgRenderer, color: '#1b1b1b', weight: 10, opacity: 0.9, lineJoin: 'round', interactive: false }).addTo(routeLayer);
      L.polyline(seg.pts, { renderer: svgRenderer, color: ROUTE_COLORS[seg.kind], weight: 6, lineJoin: 'round', lineCap: 'round', className: 'route-' + seg.kind, interactive: false }).addTo(routeLayer);
    } else {
      L.polyline(seg.pts, { renderer: svgRenderer, color: '#fff', weight: 9, opacity: 0.9, lineJoin: 'round', interactive: false }).addTo(routeLayer);
      L.polyline(seg.pts, { renderer: svgRenderer, color: ROUTE_COLORS[seg.kind], weight: 5, lineCap: 'round', lineJoin: 'round', className: 'route-' + seg.kind, interactive: false }).addTo(routeLayer);
    }
  }
  if (o.mode === 'car' && o.dest) {
    L.marker(o.dest, { interactive: false, keyboard: false, icon: L.divIcon({ className: 'park-pin', iconSize: [0, 0], html: '<b>P</b>' }) }).addTo(routeLayer);
  }
  if (fit) {
    // marge pour ne pas cacher le trajet sous la fiche (à droite, à gauche ou en bas selon l'écran)
    const dw = ($('#detail').offsetWidth || 430) + 40;
    const leftDetail = !isMobile() && window.innerWidth < 1280;
    const opts = isMobile()
      ? { paddingTopLeft: [40, 70], paddingBottomRight: [40, window.innerHeight * 0.7] }
      : leftDetail
        ? { paddingTopLeft: [Math.max(60, dw - $('#panel').offsetWidth), 60], paddingBottomRight: [60, 60] }
        : { paddingTopLeft: [60, 60], paddingBottomRight: [dw, 60] };
    Object.assign(opts, { maxZoom: 17, duration: 0.8 });
    map.flyToBounds(L.latLngBounds(all), opts);
  }
  animateTraveler(o);
}

// Petit personnage qui parcourt l'itinéraire, façon jeu vidéo
function animateTraveler(o) {
  const icons = { walk: '🚶', tram: '🚋', bike: '🚲', taxi: '🚕', car: '🚗' };
  const segs = [];
  for (const seg of o.path) {
    for (let i = 1; i < seg.pts.length; i++) segs.push({ a: seg.pts[i - 1], b: seg.pts[i], icon: icons[seg.kind] || o.icon });
  }
  const lens = segs.map((s) => Math.hypot(s.b[0] - s.a[0], (s.b[1] - s.a[1]) * 0.71));
  const total = lens.reduce((a, b) => a + b, 0);
  if (!total) return;
  traveler = L.marker(segs[0].a, { interactive: false, keyboard: false, zIndexOffset: 4000, icon: L.divIcon({ className: 'traveler', iconSize: [0, 0], html: `<span>${segs[0].icon}</span>` }) }).addTo(map);
  const dur = 6000;
  let start = null, lastIcon = segs[0].icon;
  const step = (time) => {
    if (!traveler) return;
    start ??= time;
    let f = ((time - start) % (dur + 1200)) / dur;
    if (f > 1) f = 1;
    let d = f * total, i = 0;
    while (i < segs.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
    const s = segs[i], k = lens[i] ? Math.min(1, d / lens[i]) : 1;
    traveler.setLatLng([s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k]);
    if (s.icon !== lastIcon) { lastIcon = s.icon; const el = traveler.getElement(); if (el) el.firstChild.textContent = s.icon; }
    travelerRAF = requestAnimationFrame(step);
  };
  travelerRAF = requestAnimationFrame(step);
}

// ------------------------------------------------------------------ QR code
function openQR(v, tr, mode) {
  const render = (m) => {
    const o = tr.opts.find((x) => x.mode === m) || tr.opts[0];
    const url = gmapsUrl(v, o);
    const qr = window.qrcode(0, 'M');
    qr.addData(url); qr.make();
    $('#qrBox').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    $$('.qr-modes button').forEach((b) => b.classList.toggle('on', b.dataset.m === o.mode));
    $('#qrLink').href = url;
    $('#qrInfo').textContent = t('qr.info', { m: `${o.icon} ${t('m.' + o.mode)}`, t: fmtMin(o.min) });
    $('#qrPark').textContent = o.parking ? t('qr.park', { p: o.parking }) : '';
  };
  openModal(`
    <button class="btn btn--round x" data-close>✕</button>
    <h2>📱 ${esc(v.n)}</h2>
    <p class="center">${t('qr.text')}</p>
    <div class="qr-modes">${tr.opts.map((o) => `<button class="btn btn--small" data-m="${o.mode}">${o.icon} ${t('m.' + o.mode)}</button>`).join('')}</div>
    <div class="qr" id="qrBox"></div>
    <p class="center"><b id="qrInfo"></b><br><small id="qrPark"></small><br><small>${v.a ? t('d.city', { a: esc(v.a) }) : ''}</small></p>
    <p class="center"><a id="qrLink" target="_blank" rel="noopener">${t('qr.open')}</a></p>`);
  $('.qr-modes').onclick = (e) => { const b = e.target.closest('button'); if (b) render(b.dataset.m); };
  render(mode);
}

// ------------------------------------------------------------------ Surprends-moi !
function surprise() {
  let pool = filtered.filter((v) => /open|closing/.test(v.status.state));
  if (pool.length < 3) pool = filtered;
  if (!pool.length) { toast(t('slot.none')); return; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const slot = $('#slot');
  slot.hidden = false;
  slot.innerHTML = `<div class="slot__box"><div class="slot__burst"></div><div class="slot__card">
    <div class="slot__title">${t('slot.title')}</div>
    <div class="slot__window"><div class="slot__name" id="slotName">…</div></div>
    <div id="slotEnd" style="min-height:58px"></div></div></div>`;
  const nameEl = $('#slotName');
  let delay = 45, elapsed = 0;
  const spin = () => {
    const r = pool[Math.floor(Math.random() * pool.length)];
    nameEl.textContent = `${emojiOf(r)} ${r.n}`;
    nameEl.classList.remove('tick'); void nameEl.offsetWidth; nameEl.classList.add('tick');
    elapsed += delay;
    delay *= 1.11;
    if (elapsed < 2100) setTimeout(spin, delay);
    else {
      nameEl.textContent = `${emojiOf(pick)} ${pick.n}`;
      $('#slotEnd').innerHTML = `<div class="slot__tada">${t('slot.tada')}</div>`;
      setTimeout(() => { slot.hidden = true; openDetail(pick); }, 1100);
    }
  };
  spin();
  slot.onclick = () => { slot.hidden = true; };
}

// ------------------------------------------------------------------ Réglages & partage
function openSettings() {
  const nbStaff = [...staffIds()].filter((id) => Object.keys(staff(id)).some((k) => ['fav', 'stars', 'price', 'note', 'hidden'].includes(k) && staff(id)[k])).length;
  const nbHidden = venues.filter((v) => staff(v.id).hidden).length;
  const credits = Object.entries(photos).map(([k, p]) => `<li>${esc(CUISINES[k] ? t('cui.' + k) : t('types.' + k))} : <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.author)}</a> (${esc(p.license)})</li>`).join('');
  openModal(`
    <button class="btn btn--round x" data-close>✕</button>
    <h2>${t('s.title')}</h2>
    <div class="settings">
      <section>
        <h3>${t('s.help')}</h3>
        <ul>${t('s.helpList').map((x) => `<li>${x}</li>`).join('')}</ul>
      </section>
      <section>
        <h3>${t('sy.title')}</h3>
        <div id="syncBox"></div>
      </section>
      <section>
        <h3>${t('s.staff')}</h3>
        <p>${t(sync.active ? 's.staffTextSync' : 's.staffText', { n: nbStaff, h: nbHidden ? t('s.hidden', { n: nbHidden }) : '' })}</p>
        <div class="row">
          <button class="btn" id="expBtn">${t('s.export')}</button>
          <label class="btn">${t('s.import')}<input type="file" id="impFile" accept=".json,application/json" hidden></label>
          ${nbHidden ? `<button class="btn" id="unhideBtn">${t('s.unhide')}</button>` : ''}
          ${sync.active ? '' : `<button class="btn btn--red" id="wipeBtn">${t('s.wipe')}</button>`}
        </div>
      </section>
      <section>
        <h3>${t('s.client')}</h3>
        <p>${t('s.clientText')}</p>
        <div class="row">
          <button class="btn btn--pop" id="posterBtn">${t('s.poster')}</button>
          <a class="btn" href="${clientUrl(true)}" target="_blank" rel="noopener">${t('s.preview')}</a>
        </div>
      </section>
      <section>
        <h3>${t('s.install')}</h3>
        <p>${navigator.serviceWorker?.controller ? t('s.offlineOk') : t('s.offlineWait')}</p>
        <p>${isStandalone() ? t('s.isInstalled') : t('s.notInstalled')}</p>
        <div class="row"><button class="btn btn--pop" id="guideBtn">${t('s.howInstall')}</button></div>
      </section>
      <section>
        <h3>${t('s.data')}</h3>
        <p>${t('s.dataText', { n: venues.length, d: fmtDate(dataDate), h: esc(`${HOTEL.name}, ${HOTEL.addr}`), p: nbParkings })}</p>
        <details><summary>${t('s.credits')}</summary><ul class="credits">${credits}</ul></details>
      </section>
    </div>`);
  renderSyncBox();
  $('#posterBtn').onclick = openPoster;
  $('#guideBtn').onclick = openInstallGuide;
  $('#expBtn').onclick = exportStaff;
  $('#impFile').onchange = importStaff;
  if ($('#wipeBtn')) $('#wipeBtn').onclick = () => {
    if (!confirm(t('s.wipeConfirm'))) return;
    staffLocal = {}; store.set(STAFF_KEY, staffLocal);
    venues.forEach((v) => v.marker.setIcon(pinIcon(v)));
    applyFilters(); closeModal(); toast(t('s.wiped'));
  };
  const un = $('#unhideBtn');
  if (un) un.onclick = () => {
    for (const v of venues) if (staff(v.id).hidden) setStaff(v.id, { hidden: false });
    applyFilters(); closeModal(); toast(t('s.unhidden'));
  };
}

function exportStaff() {
  const merged = {};
  for (const id of staffIds()) { const { at, by, ...s } = staff(id); merged[id] = s; }
  for (const [id, s] of Object.entries(merged)) {
    for (const k of Object.keys(s)) if (!s[k] && k !== 'nom') delete s[k];
    if (Object.keys(s).filter((k) => k !== 'nom').length === 0) { delete merged[id]; continue; }
    s.nom = byId.get(id)?.n;
  }
  const blob = new Blob([JSON.stringify({ export: new Date().toISOString(), lieux: merged }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'equipe.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(t('s.exported', { n: Object.keys(merged).length }));
}

async function importStaff(e) {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const lieux = j.lieux || j;
    let n = 0;
    for (const [id, s] of Object.entries(lieux)) {
      if (!byId.has(id)) continue;
      const { nom, at, by, ...rest } = s;
      if (sync.active) sync.set(id, rest, byId.get(id).n);
      else staffLocal[id] = { ...(staffLocal[id] || {}), ...rest };
      n++;
    }
    store.set(STAFF_KEY, staffLocal);
    venues.forEach((v) => v.marker.setIcon(pinIcon(v)));
    applyFilters(); closeModal(); toast(t('s.imported', { n }));
  } catch { toast(t('s.badFile')); }
}

// ------------------------------------------------------------------ Version clients
function clientUrl(preview = false) {
  return location.origin + location.pathname.replace(/index\.html$/, '') + (preview ? '?client&apercu' : '?client');
}

// Affiche à imprimer (A5) avec le QR code de la version clients — bilingue
function openPoster() {
  const qr = window.qrcode(0, 'M');
  qr.addData(clientUrl()); qr.make();
  const n = Math.floor((venues.length || 1700) / 100) * 100;
  openModal(`
    <button class="btn btn--round x no-print" data-close>✕</button>
    <div class="poster" id="poster">
      <div class="poster__logo">🍽️</div>
      <h2 class="poster__title">Où manger & boire<br>à Bordeaux ?</h2>
      <p class="poster__en">Where to eat & drink in Bordeaux?</p>
      <div class="poster__qr">${qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })}</div>
      <p class="poster__scan">📱 Scannez avec l’appareil photo<br><i>Scan with your phone camera</i></p>
      <ul class="poster__feat">
        <li>🗺️ ${n}+ restaurants & bars</li>
        <li>🟢 Ouvert maintenant · <i>Open now</i></li>
        <li>🚶🚋🚗 Trajets depuis l’hôtel · <i>Directions from the hotel</i></li>
        <li>❤️ Nos coups de cœur · <i>Our favourites</i></li>
        <li>🇫🇷 🇬🇧 · 📴 hors ligne · <i>works offline</i></li>
      </ul>
      <p class="poster__foot">🏨 ${esc(HOTEL.name)}</p>
    </div>
    <div class="row no-print poster__btns">
      <button class="btn btn--pop" id="printBtn">${t('poster.print')}</button>
      <a class="btn" href="${clientUrl(true)}" target="_blank" rel="noopener">${t('s.preview')}</a>
    </div>
    <p class="raw center no-print">${esc(clientUrl())}</p>`);
  $('#modal').classList.add('modal--poster');
  $('#printBtn').onclick = () => window.print();
}

function openClientHelp() {
  openModal(`
    <button class="btn btn--round x" data-close>✕</button>
    <h2>${t('c.title')}</h2>
    <div class="settings">
      <section><ul>${t('c.helpList').map((x) => `<li>${x}</li>`).join('')}</ul></section>
      <section>
        <h3>${t('s.install')}</h3>
        <p>${t('c.offline')}</p>
        <div class="row"><button class="btn btn--pop" id="guideBtn">${t('s.howInstall')}</button></div>
      </section>
      <section>
        <h3>${t('s.data')}</h3>
        <p>${t('c.dataText', { n: venues.length, d: fmtDate(dataDate) })}</p>
      </section>
    </div>`);
  $('#guideBtn').onclick = openInstallGuide;
}

// Partager un lieu (feuille de partage du téléphone, sinon copie du lien)
async function shareVenue(v, o) {
  const url = gmapsUrl(v, o);
  const text = `${v.n}${v.a ? ' – ' + v.a + ', Bordeaux' : ''}`;
  try {
    if (navigator.share) { await navigator.share({ title: v.n, text, url }); return; }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast(t('toast.copied'));
  } catch { /* partage annulé */ }
}

// Position du client sur la carte (ne change pas le point de départ des trajets : l'hôtel)
let locWatch = null, locMarker = null, locFirst = true;
function toggleLocate() {
  const btn = $('#btnLocate');
  if (locWatch != null) {
    navigator.geolocation.clearWatch(locWatch);
    locWatch = null; locMarker?.remove(); locMarker = null; btn.classList.remove('on');
    return;
  }
  if (!navigator.geolocation) { toast(t('loc.unsupported')); return; }
  locFirst = true;
  btn.classList.add('on');
  locWatch = navigator.geolocation.watchPosition((pos) => {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if (!locMarker) locMarker = L.marker(ll, { interactive: false, keyboard: false, zIndexOffset: 4500, icon: L.divIcon({ className: 'me-pin', iconSize: [0, 0], html: '<i></i>' }) }).addTo(map);
    else locMarker.setLatLng(ll);
    if (locFirst) {
      locFirst = false;
      if (map.options.maxBounds.contains(ll)) map.flyTo(ll, 16, { duration: 0.8 });
      else toast(t('loc.far'));
    }
  }, () => { toast(t('loc.denied')); if (locWatch != null) toggleLocate(); }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
}

// ------------------------------------------------------------------ Utilitaires UI
function openModal(html) {
  $('#modal').classList.remove('modal--poster');
  $('#modal .modal__box').innerHTML = html;
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; $('#modal').classList.remove('modal--poster'); }
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ------------------------------------------------------------------ PWA : installation
// L'événement « beforeinstallprompt » est capturé très tôt dans index.html (window.__bip).
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function detectDevice() {
  const ua = navigator.userAgent;
  const android = /Android/.test(ua);
  // les iPad récents se présentent comme un Mac : on les reconnaît à l'écran tactile
  const ios = !android && (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1));
  const inApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|; wv\)|GSA\//.test(ua);
  let browser = 'autre';
  if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/Edg(e|A|iOS)?\//.test(ua)) browser = 'edge';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'firefox';
  else if (/OPR\/|Opera/.test(ua)) browser = 'opera';
  else if (navigator.brave) browser = 'brave';
  else if (/CriOS|Chrome\//.test(ua)) browser = 'chrome';
  else if (/Safari\//.test(ua)) browser = 'safari';
  return { ios, android, mobile: ios || android, inApp, browser };
}

const BROWSER_NAMES = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', safari: 'Safari', samsung: 'Samsung Internet', brave: 'Brave', opera: 'Opera', autre: 'Browser' };

// Étapes d'installation selon l'appareil et le navigateur
function installSteps(d) {
  const B = BROWSER_NAMES[d.browser];
  if (d.inApp) return { title: t('i.inAppTitle'), steps: t('i.inApp').map((s) => s.replace('{b}', d.ios ? 'Safari' : 'Chrome')) };
  if (d.ios) return d.browser === 'safari' ? { title: 'iPhone / iPad · Safari', steps: t('i.iosSafari') } : { title: `iPhone / iPad · ${B}`, steps: t('i.iosOther') };
  if (d.android) {
    if (d.browser === 'samsung') return { title: 'Android · Samsung Internet', steps: t('i.samsung') };
    if (d.browser === 'firefox') return { title: 'Android · Firefox', steps: t('i.androidFirefox') };
    return { title: `Android · ${B}`, steps: t('i.android') };
  }
  const pc = t('i.desktop');
  if (d.browser === 'edge') return { title: `${pc} · Microsoft Edge`, steps: t('i.edge') };
  if (d.browser === 'firefox') return { title: `${pc} · Firefox`, warn: true, steps: t('i.firefox') };
  if (d.browser === 'safari') return { title: 'Mac · Safari', steps: t('i.safariMac') };
  if (d.browser === 'brave') return { title: `${pc} · Brave`, steps: t('i.brave') };
  return { title: `${pc} · ${B}`, steps: t('i.chrome') };
}

function openInstallGuide() {
  const d = detectDevice();
  const main = installSteps(d);
  const appUrl = location.origin + location.pathname.replace(/index\.html$/, '');
  const qr = window.qrcode(0, 'M');
  qr.addData(appUrl); qr.make();
  const others = [
    installSteps({ ios: true, browser: 'safari' }),
    installSteps({ android: true, browser: 'chrome' }),
    installSteps({ android: true, browser: 'samsung' }),
    installSteps({ browser: 'chrome' }),
    installSteps({ browser: 'edge' }),
  ].filter((o) => o.title !== main.title);
  const list = (o) => `<ol class="steps">${o.steps.map((s) => `<li>${s}</li>`).join('')}</ol>`;
  openModal(`
    <button class="btn btn--round x" data-close>✕</button>
    <h2>${t('i.title')}</h2>
    ${isStandalone() ? `<p class="ok-box">${t('i.already')}</p>` : ''}
    <div class="install-main${main.warn ? ' warn' : ''}">
      <p class="install-device">${t('i.device', { x: esc(main.title) })}</p>
      ${list(main)}
    </div>
    ${d.mobile ? '' : `
    <div class="install-qr">
      <div class="qr qr--small">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
      <p>${t('i.phone')}<br><small>${esc(appUrl)}</small></p>
    </div>`}
    <details class="install-others"><summary>${t('i.others')}</summary>
      ${others.map((o) => `<h4>${esc(o.title)}</h4>${list(o)}`).join('')}
    </details>
    <p class="raw">${t('i.after')}</p>`);
}

function updateInstallButton() {
  const btn = $('#installBtn');
  btn.hidden = isStandalone();
  btn.classList.toggle('btn--ready', !!window.__bip);
}

$('#installBtn').addEventListener('click', async () => {
  const bip = window.__bip;
  if (bip) {
    bip.prompt();
    const choice = await bip.userChoice.catch(() => null);
    window.__bip = null;
    updateInstallButton();
    if (choice?.outcome !== 'accepted') openInstallGuide();
  } else {
    openInstallGuide();
  }
});
window.addEventListener('bip-ready', updateInstallButton);
window.addEventListener('appinstalled', () => {
  window.__bip = null;
  updateInstallButton();
  toast(t('toast.installed'));
});
updateInstallButton();

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) toast(t('toast.newVersion'));
      });
    });
  }).catch(() => { /* file:// ou navigateur sans SW */ });
}
