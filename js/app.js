// Bordeaux à la carte — application principale
import { HOTEL, TYPES, TYPE_FILTERS, DEFAULT_TYPES, CUISINES, PRICE_LABELS, PRICE_HINT } from './config.js';
import { hoursStatus, weekTable, parseHours, DAY_NAMES } from './hours.js';
import { initTram, travelOptions, walkInfo, gmapsUrl, fmtMin } from './routing.js';
import { drawBasemap } from './basemap.js';

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

// Notes de l'équipe : fichier partagé data/equipe.json + modifications locales
const STAFF_KEY = 'cb.equipe.v1';
let staffShared = {};
let staffLocal = store.get(STAFF_KEY, {});
const staff = (id) => ({ ...(staffShared[id] || {}), ...(staffLocal[id] || {}) });
function setStaff(id, patch) {
  staffLocal[id] = { ...(staffLocal[id] || {}), ...patch };
  store.set(STAFF_KEY, staffLocal);
}
const priceOf = (v) => staff(v.id).price || v.p;
const typeKey = (v) => (v.t === 'cocktail' ? 'bar' : v.t);
const emojiOf = (v) => (v.c && v.c !== 'autre' && CUISINES[v.c] && v.t !== 'cafe' && v.t !== 'bar' ? CUISINES[v.c].icon : TYPES[v.t].icon);

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

let venues = [], byId = new Map(), photos = {}, dataDate = '';
let map, cluster, routeLayer, traveler, travelerRAF;
let filtered = [];
let selected = null;
let listLimit = 60;

// ------------------------------------------------------------------ Démarrage
init().catch((e) => {
  console.error(e);
  $('#loader .loader__burst').textContent = 'OUPS ! Erreur de chargement';
});

async function init() {
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
  const [vj, bm, tram, ph, eq] = await Promise.all([
    get('data/venues.json'), get('data/basemap.json'), get('data/tram.json'), get('data/photos.json'),
    get('data/equipe.json').catch(() => ({})),
  ]);
  photos = ph;
  staffShared = eq.lieux || eq || {};
  dataDate = vj.updated;
  initTram(tram);

  venues = vj.venues;
  for (const v of venues) {
    v.walk = walkInfo(v);
    v.search = norm(`${v.n} ${TYPES[v.t].label} ${v.c ? CUISINES[v.c]?.label : ''} ${v.cr || ''} ${v.a || ''}`);
    byId.set(v.id, v);
  }

  map = L.map('map', {
    zoomControl: false, minZoom: 13, maxZoom: 19, zoomSnap: 1, wheelPxPerZoomLevel: 90,
    maxBounds: [[bm.bbox.s, bm.bbox.w], [bm.bbox.n, bm.bbox.e]], maxBoundsViscosity: 0.9,
    attributionControl: true,
  }).setView([44.8355, -0.5665], 14);
  map.attributionControl.setPrefix(false).addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(map);
  drawBasemap(map, bm, tram);

  // Hôtel
  L.marker([HOTEL.la, HOTEL.lo], {
    zIndexOffset: 5000, keyboard: false,
    icon: L.divIcon({ className: 'hotel-pin', iconSize: [0, 0], html: '<div class="h">🏨</div><div class="bubble">Vous êtes ici !</div>' }),
  }).addTo(map).bindTooltip(`${HOTEL.name}<br>${HOTEL.addr}`, { direction: 'bottom', offset: [0, 8] });

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
    e.layer.bindTooltip(`<b>${kids.length} lieux</b> · ${open} ouverts<br><small>Cliquez pour zoomer</small>`, { direction: 'top', offset: [0, -18], className: 'cl-tip' }).openTooltip();
  });

  computeStatuses();
  for (const v of venues) createMarker(v);

  buildFilterUI();
  bindUI();
  applyFilters();

  // Mise à jour des voyants chaque minute
  setInterval(() => { if (state.when === 'now') { refreshStatuses(); } }, 60_000);

  $('#app').classList.remove('is-loading');
  registerSW();
  setTimeout(() => toast(`${venues.length} lieux chargés · données OSM du ${frDate(dataDate)}`), 600);
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
    b.textContent = `🕒 Statuts affichés pour ${DAY_NAMES[(d.getDay() + 6) % 7]} ${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
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
  const quick = tr.opts.filter((o) => o.mode !== 'taxi' || tr.opts.length <= 2).slice(0, 3)
    .map((o) => `<span>${o.icon} ${fmtMin(o.min)}</span>`).join('');
  card.style.setProperty('--c', T.color);
  card.innerHTML = `
    <div class="hc__photo" style="background-image:url('${ph.src}')"><span class="hc__type" style="--c:${T.color}">${emojiOf(v)} ${esc(typeLabel(v))}</span></div>
    <div class="hc__body">
      <div class="hc__name">${s.fav ? '❤️ ' : ''}${esc(v.n)}</div>
      <div class="hc__row">${priceHtml(priceOf(v))}<span class="sep">|</span>${starsHtml(s.stars)}</div>
      <div class="hc__row st--${v.status.state}"><i class="light light--${v.status.state}"></i>${esc(v.status.text)}</div>
      <div class="hc__travel">${quick}</div>
      <div class="hc__hint">Cliquez pour la fiche complète ➜</div>
    </div>`;
  card.hidden = false;
  card.classList.remove('below');
  // repositionnement
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
  const t = state.toggles;
  if (t.has('open') && !/open|closing/.test(v.status.state)) return false;
  if (t.has('fav') && !s.fav) return false;
  if (t.has('ts') && !v.ts) return false;
  if (t.has('vg') && !v.vg && v.c !== 'vege') return false;
  if (t.has('wc') && !v.wc) return false;
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
  // compteurs par type
  const counts = {};
  for (const v of venues) if (passes(v, true)) counts[typeKey(v)] = (counts[typeKey(v)] || 0) + 1;
  for (const b of $$('#typeChips .chip')) b.querySelector('.n').textContent = counts[b.dataset.type] || 0;
  $('#count').textContent = filtered.length === 0 ? 'Aucun lieu' : `${filtered.length} lieu${filtered.length > 1 ? 'x' : ''}`;
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
    ul.innerHTML = `<li class="empty"><b>Zut !</b>Aucun lieu ne correspond.<br>Essayez d'enlever un filtre.</li>`;
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
  if (filtered.length > listLimit) items.push(`<li><button class="btn btn--small more" id="moreBtn">Voir plus (${filtered.length - listLimit} restants)</button></li>`);
  ul.innerHTML = items.join('');
}

function typeLabel(v) {
  const T = TYPES[v.t];
  if ((v.t === 'restaurant' || v.t === 'fastfood') && v.c && v.c !== 'autre') return `${T.label} · ${CUISINES[v.c].label}`;
  return T.label;
}
function priceHtml(p) { return `<span class="price" title="${PRICE_LABELS[p]} (${PRICE_HINT[p]})">${'€'.repeat(p)}<em>${'€'.repeat(3 - p)}</em></span>`; }
function starsHtml(n) { return n ? `<span class="stars" title="Note de l'équipe : ${n}/5">${'★'.repeat(n)}<em>${'★'.repeat(5 - n)}</em></span>` : '<span class="stars" title="Pas encore noté"><em>★★★★★</em></span>'; }
function photoOf(v) {
  if (v.img && navigator.onLine) return { src: v.img, author: 'OpenStreetMap / Wikimedia', license: '', page: v.img, own: true };
  return photos[v.c] || photos[v.t === 'cocktail' ? 'bar' : v.t] || photos.autre;
}

// ------------------------------------------------------------------ Interface filtres
function buildFilterUI() {
  $('#typeChips').innerHTML = TYPE_FILTERS.map((k) => {
    const T = TYPES[k];
    return `<button class="chip${state.types.has(k) ? ' on' : ''}" data-type="${k}" style="--c:${T.color}">${T.icon} ${T.plural} <span class="n"></span></button>`;
  }).join('');
  $('#cuisineChips').innerHTML = Object.entries(CUISINES).map(([k, c]) =>
    `<button class="chip${state.cuisines.has(k) ? ' on' : ''}" data-cuisine="${k}">${c.icon} ${c.label}</button>`).join('');
  updateCuisineVisibility();
  for (const b of $$('#priceSeg button')) b.classList.toggle('on', state.prices.has(+b.dataset.p));
  for (const b of $$('#toggleChips button')) b.classList.toggle('on', state.toggles.has(b.dataset.t));
  $('#walkMax').value = String(state.walkMax);
  $('#sort').value = state.sort;
}
function updateCuisineVisibility() {
  $('#cuisineChips').classList.toggle('show', state.types.has('restaurant') || state.types.has('fastfood'));
}
const toggleSet = (set, k) => (set.has(k) ? set.delete(k) : set.add(k));
const pop = (el) => { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };

function bindUI() {
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
    toast(`Uniquement : ${TYPES[b.dataset.type].plural}`);
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
    buildFilterUI(); applyFilters(); toast('Filtres réinitialisés');
  });

  let qTimer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(qTimer);
    $('#clearQ').hidden = !e.target.value;
    qTimer = setTimeout(() => { state.q = norm(e.target.value.trim()); applyFilters(); }, 140);
  });
  $('#q').addEventListener('focus', () => { if (isMobile()) $('#panel').classList.add('expanded'); });
  $('#clearQ').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#clearQ').hidden = true; applyFilters(); $('#q').focus(); });

  // Moment pour le statut
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

  // Liste
  const list = $('#list');
  list.addEventListener('click', (e) => {
    if (e.target.id === 'moreBtn') { listLimit += 80; renderList(false); return; }
    const li = e.target.closest('.item'); if (!li) return;
    const v = byId.get(li.dataset.id);
    openDetail(v);
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
  $('#btnSettings').addEventListener('click', openSettings);
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

  window.addEventListener('online', () => toast('De retour en ligne 🌐'));
  window.addEventListener('offline', () => toast('Hors ligne : la carte fonctionne toujours ✔'));
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

function renderDetail(v, { keepRoute = false } = {}) {
  const T = TYPES[v.t];
  const s = staff(v.id);
  const ph = photoOf(v);
  const tr = travelOptions(v);
  const current = keepRoute && $('#detail .tcard.on')?.dataset.mode;
  const def = current || (tr.opts.find((o) => o.mode === 'tram' && o.min < tr.opts[0].min - 5) || tr.opts[0]).mode;
  const week = weekTable(v.h);
  const today = (statusDate().getDay() + 6) % 7;
  const parsed = parseHours(v.h);
  const p = priceOf(v);

  $('#detail').innerHTML = `
    <div class="detail__bar"><button class="btn btn--round detail__close" id="closeDetail" title="Fermer (Échap)">✕</button></div>
    <div class="detail__photo" style="--c:${T.color};background-image:url('${esc(ph.src)}')">
      <a class="credit" href="${esc(ph.page)}" target="_blank" rel="noopener">📷 ${ph.own ? 'Photo du lieu' : 'Photo d’illustration'} · ${esc(ph.author)}${ph.license ? ' · ' + esc(ph.license) : ''}</a>
      <div class="detail__tag"><span class="burst-tag" style="--c:${T.color}">${emojiOf(v)} ${esc(typeLabel(v))}</span></div>
    </div>
    <div class="detail__body">
      <h2 class="detail__name">${esc(v.n)}</h2>
      <div class="detail__meta">
        ${priceHtml(p)} <span><b>${PRICE_LABELS[p]}</b> · ${PRICE_HINT[p]}${s.price ? ' (corrigé par l’équipe)' : ' (estimé)'}</span>
      </div>
      <div class="status-pill s-${v.status.state}"><i class="light light--${v.status.state}"></i>${esc(v.status.text)}${v.status.approx ? ' <small>(horaires approximatifs)</small>' : ''}</div>
      <div class="rate-row">
        <span class="star-input" id="starInput" title="Note de l'équipe">${[1, 2, 3, 4, 5].map((i) => `<button data-s="${i}" class="${i <= (s.stars || 0) ? 'on' : ''}" aria-label="${i} étoile${i > 1 ? 's' : ''}">★</button>`).join('')}</span>
        <button class="btn btn--small fav-btn${s.fav ? ' on' : ''}" id="favBtn"><span>❤</span> ${s.fav ? 'Coup de cœur !' : 'Coup de cœur ?'}</button>
      </div>
      ${s.note ? `<div class="tip" style="background:#fff3b0">${esc(s.note)}</div>` : ''}

      <h3>🧭 Comment y aller ?</h3>
      <div class="tip">${esc(tr.tip)}</div>
      <div class="travel" id="travel">
        ${tr.opts.map((o) => `
          <button class="tcard${o.mode === def ? ' on' : ''}" data-mode="${o.mode}">
            <span class="tcard__icon">${o.icon}</span>
            <span class="tcard__label">${o.label}</span>
            <span class="tcard__time">${fmtMin(o.min)}</span>
            <span class="tcard__sub">${esc(o.detail)}</span>
            <span class="tcard__cost">${o.costLabel}</span>
            ${o.legs ? `<span class="legs">${o.legs.map((l) => `<span><span class="line-pill" style="--c:${l.colour}">${l.line}</span> ${esc(l.from)} → ${esc(l.to)} <small>(${l.n} arrêt${l.n > 1 ? 's' : ''})</small></span>`).join('')}</span>` : ''}
            ${o.fastest || o.cheapest ? `<span class="tcard__badges">${o.fastest ? '<span class="badge">⚡ Le plus rapide</span>' : ''}${o.cheapest ? '<span class="badge badge--cheap">💰 Le plus économique</span>' : ''}</span>` : ''}
          </button>`).join('')}
      </div>
      <p class="estim">Durées estimées depuis l’hôtel, hors attente exceptionnelle. Pour le temps réel : Google Maps.</p>
      <div class="actions">
        <button class="btn btn--pop" id="qrBtn">📱 QR code pour le client</button>
        <a class="btn" id="gmapsBtn" href="${gmapsUrl(v, tr.opts.find((o) => o.mode === def).gmode)}" target="_blank" rel="noopener">🗺️ Google Maps</a>
      </div>

      <h3>🕒 Horaires</h3>
      ${week ? `<table class="hours">${week.map((d, i) => `<tr class="${i === today ? 'today' : ''}${d.closed ? ' closed' : ''}"><td>${d.day}</td><td>${d.text}</td></tr>`).join('')}</table>
        ${parsed?.approx ? '<p class="raw">⚠️ Horaires saisonniers ou complexes : à vérifier.</p>' : ''}
        <p class="raw">Source OSM : ${esc(v.h)}</p>` : '<p>Horaires non renseignés. Appelez avant d’envoyer un client !</p>'}

      <h3>ℹ️ Infos</h3>
      <ul class="infos">
        ${v.a ? `<li>📍 <span>${esc(v.a)}, Bordeaux</span></li>` : ''}
        ${v.ph ? `<li>📞 <a href="tel:${esc(v.ph.replace(/\s/g, ''))}">${esc(v.ph)}</a></li>` : ''}
        ${v.w ? `<li>🌐 <a href="${esc(/^https?:/.test(v.w) ? v.w : 'https://' + v.w)}" target="_blank" rel="noopener">${esc(v.w.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></li>` : ''}
        ${v.cr ? `<li>🍴 <span>Cuisine : ${esc(v.cr)}</span></li>` : ''}
        ${v.d ? `<li>📝 <span>${esc(v.d)}</span></li>` : ''}
      </ul>
      <div class="tags">
        ${v.ts ? '<span class="tag">☀️ Terrasse</span>' : ''}${v.vg ? '<span class="tag">🥗 Options végé</span>' : ''}${v.wc ? '<span class="tag">♿ Accessible</span>' : ''}${v.ta ? '<span class="tag">🥡 À emporter</span>' : ''}
      </div>

      <h3>📝 Notes de l’équipe</h3>
      <div class="staff">
        <label>Prix réel :
          <span class="seg" id="staffPrice">${[1, 2, 3].map((i) => `<button data-p="${i}" class="${s.price === i ? 'on' : ''}">${'€'.repeat(i)}</button>`).join('')}</span>
        </label>
        <textarea id="staffNote" placeholder="Ex. : « Réserver le week-end », « Super accueil », « Demander Paul de notre part »…">${esc(s.note || '')}</textarea>
        <label><input type="checkbox" id="staffHidden" ${s.hidden ? 'checked' : ''}> Masquer ce lieu (fermé définitivement, à éviter…)</label>
      </div>
      <p class="src">Données © contributeurs OpenStreetMap. Une info fausse ? <a href="https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[v.id[0]]}/${v.id.slice(1)}" target="_blank" rel="noopener">Voir / corriger sur OSM</a></p>
    </div>`;

  $('#closeDetail').onclick = closeDetail;
  $('#travel').onclick = (e) => {
    const b = e.target.closest('.tcard'); if (!b) return;
    $$('#travel .tcard').forEach((x) => x.classList.toggle('on', x === b));
    const o = tr.opts.find((x) => x.mode === b.dataset.mode);
    $('#gmapsBtn').href = gmapsUrl(v, o.gmode);
    drawRoute(v, o, true);
  };
  $('#qrBtn').onclick = () => openQR(v, $('#detail .tcard.on')?.dataset.mode || def);
  $('#starInput').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const n = +b.dataset.s;
    setStaff(v.id, { stars: staff(v.id).stars === n ? 0 : n });
    afterStaffChange(v);
    toast(staff(v.id).stars ? `Noté ${n}/5 ⭐` : 'Note retirée');
  };
  $('#favBtn').onclick = () => {
    setStaff(v.id, { fav: !staff(v.id).fav });
    afterStaffChange(v);
    toast(staff(v.id).fav ? 'Ajouté aux coups de cœur ❤️' : 'Retiré des coups de cœur');
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
    toast(e.target.checked ? 'Lieu masqué (réglages pour tout réafficher)' : 'Lieu de nouveau visible');
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
    } else {
      const col = { walk: '#1b1b1b', bike: '#1d8a2c', taxi: '#e0a100' }[seg.kind];
      L.polyline(seg.pts, { renderer: svgRenderer, color: '#fff', weight: 9, opacity: 0.9, interactive: false }).addTo(routeLayer);
      L.polyline(seg.pts, { renderer: svgRenderer, color: col, weight: 5, lineCap: 'round', className: 'route-' + seg.kind, interactive: false }).addTo(routeLayer);
    }
  }
  if (fit) {
    const pad = isMobile() ? [40, 70] : [60, 60];
    const opts = { paddingTopLeft: pad, paddingBottomRight: isMobile() ? [40, window.innerHeight * 0.7] : [($('#detail').offsetWidth || 430) + 40, 60], maxZoom: 17, duration: 0.8 };
    map.flyToBounds(L.latLngBounds(all), opts);
  }
  animateTraveler(o);
}

// Petit personnage qui parcourt l'itinéraire, façon jeu vidéo
function animateTraveler(o) {
  const segs = [];
  for (const seg of o.path) {
    const icon = seg.kind === 'tram' ? '🚋' : seg.kind === 'walk' ? '🚶' : o.icon;
    for (let i = 1; i < seg.pts.length; i++) segs.push({ a: seg.pts[i - 1], b: seg.pts[i], icon });
  }
  const lens = segs.map((s) => Math.hypot(s.b[0] - s.a[0], (s.b[1] - s.a[1]) * 0.71));
  const total = lens.reduce((a, b) => a + b, 0);
  if (!total) return;
  traveler = L.marker(segs[0].a, { interactive: false, keyboard: false, zIndexOffset: 4000, icon: L.divIcon({ className: 'traveler', iconSize: [0, 0], html: `<span>${segs[0].icon}</span>` }) }).addTo(map);
  const dur = 5000;
  let start = null, lastIcon = segs[0].icon;
  const step = (t) => {
    if (!traveler) return;
    start ??= t;
    let f = ((t - start) % (dur + 1200)) / dur;
    if (f > 1) f = 1;
    let dist = f * total, i = 0;
    while (i < segs.length - 1 && dist > lens[i]) { dist -= lens[i]; i++; }
    const s = segs[i], k = lens[i] ? Math.min(1, dist / lens[i]) : 1;
    traveler.setLatLng([s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k]);
    if (s.icon !== lastIcon) { lastIcon = s.icon; const el = traveler.getElement(); if (el) el.firstChild.textContent = s.icon; }
    travelerRAF = requestAnimationFrame(step);
  };
  travelerRAF = requestAnimationFrame(step);
}

// ------------------------------------------------------------------ QR code
function openQR(v, mode) {
  const tr = travelOptions(v);
  const modes = tr.opts.map((o) => ({ mode: o.mode, label: `${o.icon} ${o.label}`, g: o.gmode, min: o.min }));
  const render = (m) => {
    const o = modes.find((x) => x.mode === m) || modes[0];
    const url = gmapsUrl(v, o.g);
    const qr = window.qrcode(0, 'M');
    qr.addData(url); qr.make();
    $('#qrBox').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    $$('.qr-modes button').forEach((b) => b.classList.toggle('on', b.dataset.m === o.mode));
    $('#qrLink').href = url;
    $('#qrInfo').textContent = `${o.label} · environ ${fmtMin(o.min)} depuis l’hôtel`;
  };
  openModal(`
    <button class="btn btn--round x" data-close>✕</button>
    <h2>📱 ${esc(v.n)}</h2>
    <p class="center">Le client scanne ce code avec l’appareil photo de son téléphone : l’itinéraire s’ouvre dans Google Maps.</p>
    <div class="qr-modes">${modes.map((m) => `<button class="btn btn--small" data-m="${m.mode}">${m.label}</button>`).join('')}</div>
    <div class="qr" id="qrBox"></div>
    <p class="center"><b id="qrInfo"></b><br><small>${v.a ? esc(v.a) + ', Bordeaux' : ''}</small></p>
    <p class="center"><a id="qrLink" target="_blank" rel="noopener">Ouvrir le lien</a></p>`);
  $('.qr-modes').onclick = (e) => { const b = e.target.closest('button'); if (b) render(b.dataset.m); };
  render(mode);
}

// ------------------------------------------------------------------ Surprends-moi !
function surprise() {
  let pool = filtered.filter((v) => /open|closing/.test(v.status.state));
  if (pool.length < 3) pool = filtered;
  if (!pool.length) { toast('Aucun lieu avec ces filtres 😅'); return; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const slot = $('#slot');
  slot.hidden = false;
  slot.innerHTML = `<div class="slot__box"><div class="slot__burst"></div><div class="slot__card">
    <div class="slot__title">🎰 LA ROUE DU GOÛT TOURNE…</div>
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
      $('#slotEnd').innerHTML = '<div class="slot__tada">TADAAA !</div>';
      setTimeout(() => {
        slot.hidden = true;
        openDetail(pick);
      }, 1100);
    }
  };
  spin();
  slot.onclick = () => { slot.hidden = true; };
}

// ------------------------------------------------------------------ Réglages & partage
function openSettings() {
  const nbStaff = Object.keys({ ...staffShared, ...staffLocal }).length;
  const nbHidden = venues.filter((v) => staff(v.id).hidden).length;
  const credits = Object.entries(photos).map(([k, p]) => `<li>${esc(CUISINES[k]?.label || TYPES[k]?.label || k)} : <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.author)}</a> (${esc(p.license)})</li>`).join('');
  openModal(`
    <button class="btn btn--round x" data-close>✕</button>
    <h2>⚙️ Réglages & aide</h2>
    <div class="settings">
      <section>
        <h3>🕹️ Mode d’emploi</h3>
        <ul>
          <li><b>Survolez</b> une icône : une bulle résume le lieu. <b>Cliquez</b> pour la fiche complète et l’itinéraire.</li>
          <li><b>Double-cliquez</b> une catégorie pour n’afficher qu’elle.</li>
          <li>« 🕒 Statut » : vérifiez qui sera ouvert <b>ce soir à 20h</b> ou à une date précise.</li>
          <li>« 📱 QR code » : le client repart avec l’itinéraire sur son téléphone.</li>
          <li>Touche <b>/</b> pour chercher, <b>Échap</b> pour fermer.</li>
        </ul>
      </section>
      <section>
        <h3>❤️ Notes de l’équipe</h3>
        <p>${nbStaff} lieu(x) annoté(s)${nbHidden ? `, ${nbHidden} masqué(s)` : ''}. Les notes sont enregistrées sur <b>cet appareil</b>. Pour les partager avec les collègues : exportez le fichier <code>equipe.json</code>, placez-le dans le dossier <code>data/</code> de l’app puis republiez-la (voir le README).</p>
        <div class="row">
          <button class="btn" id="expBtn">⬇ Exporter</button>
          <label class="btn">⬆ Importer<input type="file" id="impFile" accept=".json,application/json" hidden></label>
          ${nbHidden ? '<button class="btn" id="unhideBtn">👁 Réafficher les lieux masqués</button>' : ''}
          <button class="btn btn--red" id="wipeBtn">🗑 Effacer mes notes locales</button>
        </div>
      </section>
      <section>
        <h3>📲 Installation & hors ligne</h3>
        <p>${navigator.serviceWorker?.controller ? '✅ L’app est disponible hors ligne sur cet appareil.' : '⏳ Le mode hors ligne s’active après le premier chargement (en https ou en local).'}</p>
        <p>${isStandalone() ? '✅ Vous utilisez l’app installée.' : 'L’app n’est pas encore installée sur cet appareil.'}</p>
        <div class="row"><button class="btn btn--pop" id="guideBtn">📲 Comment installer ?</button></div>
      </section>
      <section>
        <h3>ℹ️ Données</h3>
        <p>${venues.length} lieux · OpenStreetMap, mise à jour du ${frDate(dataDate)}. Départ des trajets : ${esc(HOTEL.name)}, ${esc(HOTEL.addr)}. Les prix (€) sont estimés selon le type de lieu : corrigez-les dans les fiches.</p>
        <details><summary>Crédits photos (Wikimedia Commons)</summary><ul class="credits">${credits}</ul></details>
      </section>
    </div>`);
  $('#guideBtn').onclick = openInstallGuide;
  $('#expBtn').onclick = exportStaff;
  $('#impFile').onchange = importStaff;
  $('#wipeBtn').onclick = () => {
    if (!confirm('Effacer toutes les notes enregistrées sur cet appareil ? (Le fichier partagé n’est pas touché.)')) return;
    staffLocal = {}; store.set(STAFF_KEY, staffLocal);
    venues.forEach((v) => v.marker.setIcon(pinIcon(v)));
    applyFilters(); closeModal(); toast('Notes locales effacées');
  };
  const un = $('#unhideBtn');
  if (un) un.onclick = () => {
    for (const v of venues) if (staff(v.id).hidden) setStaff(v.id, { hidden: false });
    applyFilters(); closeModal(); toast('Tous les lieux sont visibles');
  };
}

function exportStaff() {
  const merged = {};
  for (const [id, s] of Object.entries({ ...staffShared })) merged[id] = { ...s };
  for (const [id, s] of Object.entries(staffLocal)) merged[id] = { ...(merged[id] || {}), ...s };
  // nettoyage + nom lisible
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
  toast(`${Object.keys(merged).length} fiche(s) exportée(s)`);
}

async function importStaff(e) {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const lieux = j.lieux || j;
    let n = 0;
    for (const [id, s] of Object.entries(lieux)) if (byId.has(id)) { const { nom, ...rest } = s; staffLocal[id] = { ...(staffLocal[id] || {}), ...rest }; n++; }
    store.set(STAFF_KEY, staffLocal);
    venues.forEach((v) => v.marker.setIcon(pinIcon(v)));
    applyFilters(); closeModal(); toast(`${n} fiche(s) importée(s) ✔`);
  } catch { toast('Fichier invalide 😕'); }
}

// ------------------------------------------------------------------ Utilitaires UI
function openModal(html) {
  $('#modal .modal__box').innerHTML = html;
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; }
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function frDate(iso) {
  if (!iso) return '?';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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

const BROWSER_NAMES = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', safari: 'Safari', samsung: 'Samsung Internet', brave: 'Brave', opera: 'Opera', autre: 'navigateur' };

// Étapes d'installation selon l'appareil et le navigateur
function installSteps(d) {
  if (d.inApp) return { title: 'Navigateur intégré à une appli', steps: [
    'Vous avez ouvert le lien depuis une appli (WhatsApp, Messenger, scanner de QR…) : l’installation y est impossible.',
    `Touchez le menu ⋮ ou ⋯ puis <b>« Ouvrir dans ${d.ios ? 'Safari' : 'Chrome'} »</b>.`,
    'Suivez ensuite les étapes affichées par le bouton « Installer ».'] };
  if (d.ios) {
    if (d.browser === 'safari') return { title: 'iPhone / iPad · Safari', steps: [
      'Touchez le bouton <b>Partager</b> <span class="kbd">⬆︎</span> (carré avec une flèche, en bas de l’écran, ou en haut sur iPad).',
      'Faites défiler et touchez <b>« Sur l’écran d’accueil »</b> <span class="kbd">⊞</span>.',
      'Touchez <b>« Ajouter »</b> en haut à droite. L’icône apparaît sur l’écran d’accueil.'] };
    return { title: `iPhone / iPad · ${BROWSER_NAMES[d.browser]}`, steps: [
      'Touchez le bouton <b>Partager</b> <span class="kbd">⬆︎</span> (dans la barre d’adresse ou le menu ⋯).',
      'Choisissez <b>« Sur l’écran d’accueil »</b>, puis <b>« Ajouter »</b>.',
      'L’option n’apparaît pas ? Ouvrez l’adresse dans <b>Safari</b> : c’est le navigateur le plus fiable sur iPhone.'] };
  }
  if (d.android) {
    if (d.browser === 'samsung') return { title: 'Android · Samsung Internet', steps: [
      'Touchez le menu <span class="kbd">☰</span> en bas à droite.',
      'Choisissez <b>« Ajouter la page à »</b> puis <b>« Écran d’accueil »</b>.',
      'Validez avec <b>« Ajouter »</b>.'] };
    if (d.browser === 'firefox') return { title: 'Android · Firefox', steps: [
      'Touchez le menu <span class="kbd">⋮</span>.',
      'Choisissez <b>« Installer »</b> ou <b>« Ajouter à l’écran d’accueil »</b>.',
      'Validez avec <b>« Ajouter »</b>.'] };
    return { title: `Android · ${BROWSER_NAMES[d.browser]}`, steps: [
      'Touchez le menu <span class="kbd">⋮</span> en haut à droite.',
      'Choisissez <b>« Installer l’application »</b> (ou <b>« Ajouter à l’écran d’accueil »</b> puis <b>« Installer »</b>).',
      'Validez. L’icône apparaît sur l’écran d’accueil et dans la liste des applis.'] };
  }
  // Ordinateur
  if (d.browser === 'edge') return { title: 'Ordinateur · Microsoft Edge', steps: [
    'Cliquez l’icône <b>« Application disponible »</b> <span class="kbd">⊞</span> à droite de la barre d’adresse.',
    'Sinon : menu <span class="kbd">⋯</span> → <b>« Applications »</b> → <b>« Installer ce site en tant qu’application »</b>.',
    'Cliquez <b>« Installer »</b>. L’app s’ouvre dans sa propre fenêtre et peut être épinglée à la barre des tâches.'] };
  if (d.browser === 'firefox') return { title: 'Ordinateur · Firefox', warn: true, steps: [
    'Firefox ne sait pas installer d’applications web sur ordinateur (l’app fonctionne quand même, y compris hors ligne).',
    'Pour l’installer, ouvrez cette même adresse dans <b>Microsoft Edge</b> (présent sur tous les PC Windows) ou <b>Google Chrome</b>, puis cliquez sur « Installer ».',
    'Ou simplement : ajoutez un <b>favori</b> (Ctrl + D) ou un raccourci sur le bureau.'] };
  if (d.browser === 'safari') return { title: 'Mac · Safari', steps: [
    'Menu <b>Fichier</b> → <b>« Ajouter au Dock… »</b> (macOS Sonoma ou plus récent).',
    'Cliquez <b>« Ajouter »</b>. L’app apparaît dans le Dock et le Launchpad.'] };
  if (d.browser === 'brave') return { title: 'Ordinateur · Brave', steps: [
    'Cliquez l’icône d’installation <span class="kbd">⤓</span> à droite de la barre d’adresse.',
    'Sinon : menu <span class="kbd">≡</span> → <b>« Enregistrer et partager »</b> → <b>« Installer Bordeaux à la carte… »</b>.'] };
  return { title: `Ordinateur · ${BROWSER_NAMES[d.browser]}`, steps: [
    'Cliquez l’icône d’installation <span class="kbd">⤓</span> (petit écran avec une flèche) à droite de la barre d’adresse.',
    'Sinon : menu <span class="kbd">⋮</span> → <b>« Caster, enregistrer et partager »</b> → <b>« Installer la page en tant qu’application… »</b>.',
    'Cliquez <b>« Installer »</b>. L’app s’ouvre dans sa propre fenêtre et peut être épinglée à la barre des tâches.'] };
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
    <h2>📲 Installer l’app</h2>
    ${isStandalone() ? '<p class="ok-box">✅ Vous utilisez déjà l’app installée !</p>' : ''}
    <div class="install-main${main.warn ? ' warn' : ''}">
      <p class="install-device">Votre appareil : <b>${esc(main.title)}</b></p>
      ${list(main)}
    </div>
    ${d.mobile ? '' : `
    <div class="install-qr">
      <div class="qr qr--small">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
      <p><b>Installer sur un téléphone ?</b><br>Scannez ce code avec l’appareil photo, puis touchez « Installer » dans l’app.<br><small>${esc(appUrl)}</small></p>
    </div>`}
    <details class="install-others"><summary>Autres appareils</summary>
      ${others.map((o) => `<h4>${esc(o.title)}</h4>${list(o)}`).join('')}
    </details>
    <p class="raw">Une fois installée, l’app s’ouvre depuis son icône et fonctionne même sans internet.</p>`);
}

function updateInstallButton() {
  const btn = $('#installBtn');
  btn.hidden = isStandalone();
  btn.classList.toggle('btn--ready', !!window.__bip);
}

$('#installBtn').addEventListener('click', async () => {
  const bip = window.__bip;
  if (bip) {
    // Le navigateur sait installer directement : on ouvre sa fenêtre d'installation
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
  toast('App installée ! Retrouvez-la avec son icône 🎉');
});
updateInstallButton();
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Nouvelle version disponible : rechargez la page 🔄');
      });
    });
  }).catch(() => { /* file:// ou navigateur sans SW */ });
}
