/**
 * Bordeaux à la carte — synchronisation des notes de l'équipe dans Google Sheets.
 *
 * Installation (5 minutes, voir le README, section « Notes synchronisées ») :
 *  1. Créez un Google Sheets vide (ex. « Bordeaux à la carte – notes »).
 *  2. Menu Extensions → Apps Script. Effacez le contenu et collez tout ce fichier.
 *  3. Remplacez le code d'équipe ci-dessous par le vôtre, puis enregistrez (💾).
 *  4. Déployer → Nouveau déploiement → type « Application Web » :
 *       - Exécuter en tant que : Moi
 *       - Qui a accès : Tout le monde
 *     Autorisez l'accès quand Google le demande, puis copiez l'URL de l'application Web.
 *  5. Collez cette URL dans l'app (⚙️ Réglages → Notes synchronisées) ou transmettez-la.
 *
 * Le code d'équipe reste ici, dans le script (invisible depuis le site). Sans lui, personne
 * ne peut lire ni modifier les notes.
 */

const CODE_EQUIPE = 'CHANGEZ-MOI';   // ← choisissez un code (ex. « ibis2026 ») et donnez-le aux collègues

const FEUILLE = 'notes';
const ENTETES = ['id', 'nom', 'coup de cœur', 'étoiles', 'prix (1-3)', 'note', 'masqué', 'modifié le', 'par'];
const COL = { fav: 2, stars: 3, price: 4, note: 5, hidden: 6 };

function doGet() {
  return out({ ok: true, service: 'bordeaux-a-la-carte' });
}

function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'json' }); }
  if (CODE_EQUIPE === 'CHANGEZ-MOI') return out({ ok: false, error: 'pin' });
  const sh = feuille();
  // Version clients : coups de cœur, étoiles, prix et lieux masqués uniquement (jamais les commentaires)
  if (p.action === 'public') {
    const all = lire(sh), pub = {};
    for (const id in all) {
      const r = all[id];
      if (r.fav || r.stars || r.price || r.hidden) pub[id] = { fav: r.fav, stars: r.stars, price: r.price, hidden: r.hidden };
    }
    return out({ ok: true, lieux: pub });
  }
  if (String(p.pin || '') !== CODE_EQUIPE) return out({ ok: false, error: 'pin' });
  if (p.action === 'bulk') {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const lieux = p.lieux || {};
      for (const id in lieux) ecrire(sh, id, lieux[id], String(p.by || '').slice(0, 40));
      SpreadsheetApp.flush();
    } finally { lock.releaseLock(); }
  }
  return out({ ok: true, lieux: lire(sh), now: Date.now() });
}

function feuille() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(FEUILLE);
  if (!sh) {
    sh = ss.insertSheet(FEUILLE);
    sh.appendRow(ENTETES);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, ENTETES.length).setFontWeight('bold').setBackground('#ffd23f');
  }
  return sh;
}

function lire(sh) {
  const v = sh.getDataRange().getValues();
  const res = {};
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!r[0]) continue;
    res[r[0]] = {
      fav: r[2] === true || r[2] === 'TRUE',
      stars: Number(r[3]) || 0,
      price: Number(r[4]) || 0,
      note: String(r[5] || ''),
      hidden: r[6] === true || r[6] === 'TRUE',
      at: r[7] instanceof Date ? r[7].getTime() : 0,
      by: String(r[8] || ''),
    };
  }
  return res;
}

function ecrire(sh, id, patch, by) {
  if (!/^[nwr]\d+$/.test(id) || !patch) return;
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => r[0]) : [];
  let row = ids.indexOf(id);
  let cur;
  if (row < 0) {
    cur = [id, '', false, 0, 0, '', false, new Date(), ''];
    sh.appendRow(cur);
    row = sh.getLastRow();
  } else {
    row += 2;
    cur = sh.getRange(row, 1, 1, ENTETES.length).getValues()[0];
  }
  for (const k in COL) {
    if (!(k in patch)) continue;
    let val = patch[k];
    if (k === 'note') { val = String(val || '').slice(0, 1000); if (/^[=+\-@]/.test(val)) val = "'" + val; }
    else if (k === 'stars') val = Math.max(0, Math.min(5, Number(val) || 0));
    else if (k === 'price') val = Math.max(0, Math.min(3, Number(val) || 0));
    else val = !!val;
    cur[COL[k]] = val;
  }
  if (patch.nom) cur[1] = String(patch.nom).slice(0, 120);
  cur[7] = new Date();
  if (by) cur[8] = by;
  sh.getRange(row, 1, 1, ENTETES.length).setValues([cur]);
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
