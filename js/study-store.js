/* Study Portal — per-bank progress store + one-time migration (pt1-quiz-upgrade).
 *
 * localStorage key per bank:  sp_bank_v1:<bankKey>     (bankKey = "medphys/pt1")
 *   {
 *     solved: { <questionId>: <timestamp> },          // PT1 "solved set" (decks skip these)
 *     cards:  { <cardId>: { mood, score, total, done, at } },
 *     runs:   { <cardId>: <run state, by question id> },
 *     resets: { <cardId>: { at, ids:[...] } }          // so a reset is not undone by sync
 *   }
 * Cloud: progress/{uid}.forms["b_<slug>_<hash>"] = same object (+ bank, wires removed).
 * Old keys (pt1_form_<L>_*) are never deleted; StudyMigrate copies them once.
 */
(function (global) {
  var PREFIX = 'sp_bank_v1:';
  var LEGACY_PREFIX = 'pt1_form_';
  var LEGACY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  var LEGACY_FLAG = 'sp_legacy_migrated_v1';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function hash(s) {
    var h = 2166136261 >>> 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function safeKey(s) {
    return String(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48) + '_' + hash(s);
  }
  function cloudKey(bankKey) { return 'b_' + safeKey(bankKey); }

  function blank() { return { solved: {}, cards: {}, runs: {}, resets: {} }; }
  function norm(st) {
    st = st && typeof st === 'object' ? st : {};
    var out = blank();
    if (st.solved && typeof st.solved === 'object') {
      if (Array.isArray(st.solved)) st.solved.forEach(function (id) { out.solved[String(id)] = 1; });
      else Object.keys(st.solved).forEach(function (id) { out.solved[id] = Number(st.solved[id]) || 1; });
    }
    ['cards', 'runs', 'resets'].forEach(function (k) {
      if (st[k] && typeof st[k] === 'object' && !Array.isArray(st[k])) out[k] = st[k];
    });
    return out;
  }
  function load(bankKey) {
    var raw = lsGet(PREFIX + bankKey);
    if (!raw) return blank();
    try { return norm(JSON.parse(raw)); } catch (e) { return blank(); }
  }
  function save(bankKey, st, opts) {
    lsSet(PREFIX + bankKey, JSON.stringify(norm(st)));
    if (!(opts && opts.skipCloud) && global.StudyProgress && typeof StudyProgress.syncFormsFromLocal === 'function') {
      StudyProgress.syncFormsFromLocal();
    }
  }
  function bankKeys() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
      }
    } catch (e) {}
    return out;
  }
  function solvedSet(bankKey) { return new Set(Object.keys(load(bankKey).solved)); }
  function markSolved(bankKey, id, opts) {
    var st = load(bankKey);
    if (!st.solved[id]) st.solved[String(id)] = Date.now();
    save(bankKey, st, opts);
  }

  /* —— merge (local ⊕ cloud). Max/newest wins; resets remove older solves. —— */
  function newer(a, b, field) {
    if (!a) return b;
    if (!b) return a;
    return (Number(a[field]) || 0) >= (Number(b[field]) || 0) ? a : b;
  }
  function mergeEntries(a, b) {
    a = norm(a); b = norm(b);
    var out = blank();
    [a.solved, b.solved].forEach(function (s) {
      Object.keys(s).forEach(function (id) { out.solved[id] = Math.max(out.solved[id] || 0, Number(s[id]) || 1); });
    });
    var rk = {};
    Object.keys(a.resets).concat(Object.keys(b.resets)).forEach(function (k) { rk[k] = 1; });
    Object.keys(rk).forEach(function (k) { out.resets[k] = newer(a.resets[k], b.resets[k], 'at'); });
    var ck = {};
    Object.keys(a.cards).concat(Object.keys(b.cards)).forEach(function (k) { ck[k] = 1; });
    Object.keys(ck).forEach(function (k) {
      var pick = newer(a.cards[k], b.cards[k], 'at');
      var other = pick === a.cards[k] ? b.cards[k] : a.cards[k];
      out.cards[k] = Object.assign({}, other || {}, pick || {});
      if (!out.cards[k].mood && other && other.mood) out.cards[k].mood = other.mood;
    });
    var nk = {};
    Object.keys(a.runs).concat(Object.keys(b.runs)).forEach(function (k) { nk[k] = 1; });
    Object.keys(nk).forEach(function (k) {
      var ra = a.runs[k], rb = b.runs[k];
      var pick = newer(ra, rb, 'updated');
      // a local run with wires beats an identical cloud copy without them
      if (ra && rb && (ra.updated || 0) === (rb.updated || 0)) pick = ra;
      out.runs[k] = pick;
    });
    Object.keys(out.resets).forEach(function (k) {
      var r = out.resets[k];
      if (!r) return;
      (r.ids || []).forEach(function (id) {
        if (out.solved[id] && out.solved[id] <= (r.at || 0)) delete out.solved[id];
      });
      if (out.runs[k] && (out.runs[k].updated || 0) <= (r.at || 0)) delete out.runs[k];
    });
    return out;
  }
  function stripWires(run) {
  if (!run || typeof run !== 'object') return run;
  var c = JSON.parse(JSON.stringify(run));
  if (c.ans && typeof c.ans === 'object') {
    Object.keys(c.ans).forEach(function (k) {
      var v = c.ans[k];
      if (v && typeof v === 'object' && v.wires) delete v.wires;
    });
  }
  // Flatten any nested arrays that may appear in deck or ans
  if (Array.isArray(c.deck)) {
    c.deck = c.deck.map(function (item) {
      return (item && typeof item === 'object' && !Array.isArray(item)) ? item : { value: item };
    });
  }
  return c;
}
  /** forms-map entries for Firestore (rules only allow the existing top-level keys). */
  function collectForCloud() {
    var out = {};
    bankKeys().forEach(function (bk) {
      var st = load(bk);
      var runs = {};
      Object.keys(st.runs).forEach(function (k) { runs[k] = stripWires(st.runs[k]); });
      out[cloudKey(bk)] = { bank: bk, solved: st.solved, cards: st.cards, runs: runs, resets: st.resets };
    });
    return out;
  }
  function isCloudEntry(key, entry) {
    return /^b_/.test(String(key)) && entry && typeof entry === 'object' && typeof entry.bank === 'string';
  }
  function applyFromCloud(forms) {
    if (!forms || typeof forms !== 'object') return false;
    var changed = false;
    Object.keys(forms).forEach(function (k) {
      var e = forms[k];
      if (!isCloudEntry(k, e)) return;
      var merged = mergeEntries(load(e.bank), e);
      save(e.bank, merged, { skipCloud: true });
      changed = true;
    });
    return changed;
  }

  /**
   * A bank was replaced by a newer one (bank.legacy.idMap: old id -> new id).
   * Solved ids are moved to their new ids; old ids with no new question are
   * dropped. Half-done runs of cards that no longer exist are dropped (their
   * order and answers belong to the old cards). Idempotent: runs on every load,
   * so old ids that come back from an older cloud copy are moved again.
   */
  function remapIds(bankKey, map, valid) {
    map = map || {};
    var st = load(bankKey);
    var changed = false;
    var report = { moved: 0, dropped: 0, runsDropped: 0 };
    Object.keys(st.solved).forEach(function (id) {
      if (valid.ids.has(id)) return;
      var to = map[id];
      if (to && valid.ids.has(to)) {
        st.solved[to] = Math.max(Number(st.solved[to]) || 0, Number(st.solved[id]) || 1);
        report.moved++;
      } else report.dropped++;
      delete st.solved[id];
      changed = true;
    });
    Object.keys(st.runs).forEach(function (cid) {
      if (valid.cards.has(cid)) return;
      delete st.runs[cid];
      report.runsDropped++;
      changed = true;
    });
    if (changed) {
      save(bankKey, st);
      try { console.info('[StudyStore] ' + bankKey + ' progress moved to the new bank ids', report); } catch (e) {}
    }
    return report;
  }

  /**
   * Copy progress from an OLD bank key into a NEW bank key once (a bank that
   * moved, e.g. Lecture 11 into PT2). mapId(oldId) → new id; ids that do not
   * land in validIds are skipped. cardMap {oldCardId: newCardId} carries the
   * card's mood/score and its half-done run (ids rewritten). The old key is
   * left untouched. Runs once per old→new pair (flag sp_import_v1:<old>><new>),
   * so a later reset of the new card is never undone.
   */
  var IMPORT_FLAG = 'sp_import_v1:';
  function importFrom(oldKey, newKey, mapId, validIds, cardMap) {
    var flag = IMPORT_FLAG + oldKey + '>' + newKey;
    if (lsGet(flag)) return { skipped: 'already imported' };
    var raw = lsGet(PREFIX + oldKey);
    if (!raw) { lsSet(flag, String(Date.now())); return { skipped: 'nothing stored under ' + oldKey }; }
    var old = load(oldKey);
    var st = load(newKey);
    var rep = { solved: 0, skipped: 0, cards: 0, runs: 0 };
    Object.keys(old.solved).forEach(function (id) {
      var to = mapId(id);
      if (to && validIds.has(to)) { st.solved[to] = Math.max(Number(st.solved[to]) || 0, Number(old.solved[id]) || 1); rep.solved++; }
      else rep.skipped++;
    });
    cardMap = cardMap || {};
    Object.keys(cardMap).forEach(function (oc) {
      var nc = cardMap[oc];
      if (old.cards[oc] && !st.cards[nc]) { st.cards[nc] = old.cards[oc]; rep.cards++; }
      var run = old.runs[oc];
      if (run && !st.runs[nc] && run.v === 2 && Array.isArray(run.deck)) {
        var r = JSON.parse(JSON.stringify(run));
        r.card = nc;
        r.deck = r.deck.map(function (d) { d.id = mapId(d.id) || d.id; return d; }).filter(function (d) { return validIds.has(d.id); });
        var ans = {};
        Object.keys(r.ans || {}).forEach(function (k) {
          var parts = k.split('#'); var to = mapId(parts[0]);
          if (to && validIds.has(to)) ans[to + (parts.length > 1 ? '#' + parts.slice(1).join('#') : '')] = r.ans[k];
        });
        r.ans = ans;
        if (r.deck.length) { st.runs[nc] = r; rep.runs++; }
      }
    });
    save(newKey, st);
    lsSet(flag, String(Date.now()));
    return rep;
  }

  /* —— migration —— */
  var bankCache = {};
  function fetchBank(bankKey) {
    if (!bankCache[bankKey]) {
      bankCache[bankKey] = fetch('banks/' + bankKey + '.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('bank ' + r.status); return r.json(); })
        .catch(function (e) { delete bankCache[bankKey]; throw e; });
    }
    return bankCache[bankKey];
  }
  function idAt(bank, letter, i) {
    var qs = (bank && bank.bank && bank.bank[letter]) || [];
    var q = qs[i];
    if (!q) return null;
    var id = String(q.id != null ? q.id : ('q_' + String(q.q || '').slice(0, 48) + '_' + i));
    if (bank.__idMap) return bank.__idMap[id] || null; // old bank position -> new bank id
    return id;
  }
  /**
   * Bank used to read OLD position-based saves (forms A-H by index). When the
   * current bank declares legacy.bank, positions refer to that old file, and
   * ids are translated through legacy.idMap.
   */
  var posCache = {};
  function fetchPositionBank(bankKey) {
    if (!posCache[bankKey]) {
      posCache[bankKey] = fetchBank(bankKey).then(function (b) {
        if (!b || !b.legacy || !b.legacy.bank) return b;
        return fetch(b.legacy.bank, { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error('legacy bank ' + r.status); return r.json(); })
          .then(function (old) { old.__idMap = b.legacy.idMap || {}; return old; });
      }).catch(function (e) { delete posCache[bankKey]; throw e; });
    }
    return posCache[bankKey];
  }
  function legacySignature() {
    var parts = [];
    LEGACY_LETTERS.forEach(function (L) {
      ['best_pct', 'run_pct', 'run_state', 'done', 'score'].forEach(function (f) {
        var v = lsGet(LEGACY_PREFIX + L + '_' + f);
        if (v != null && v !== '') parts.push(L + f + '=' + v);
      });
    });
    return parts.length ? hash(parts.join('|')) : '';
  }

  /**
   * Copy old pt1_form_<L>_* progress into the per-bank solved sets.
   * Ownership (medphys and studyskills shared these keys):
   *   - run_state answers with 20 entries → medphys/pt1 (20-question forms),
   *     21 entries → studyskills/ss1 (21-question forms); each stored answer is
   *     checked against that bank's correct option, falling back to the other bank.
   *   - "done"/best 100% without answers → medphys/pt1 (the original owner).
   * Old keys stay untouched. Re-runs only if the old keys change (idempotent).
   */
  function migrateLegacy() {
    var sig = legacySignature();
    if (!sig) return Promise.resolve({ skipped: 'no legacy data' });
    if (lsGet(LEGACY_FLAG) === sig) return Promise.resolve({ skipped: 'already migrated' });
    var owners = ['medphys/pt1', 'studyskills/ss1'];
    return Promise.all(owners.map(function (bk) { return fetchPositionBank(bk).catch(function () { return null; }); }))
      .then(function (banks) {
        var byKey = {};
        owners.forEach(function (bk, i) { byKey[bk] = banks[i]; });
        var report = { solved: {}, unmatched: 0 };
        function add(bk, id) {
          if (!id) return;
          report.solved[bk] = report.solved[bk] || {};
          report.solved[bk][id] = 1;
        }
        LEGACY_LETTERS.forEach(function (L) {
          var rsRaw = lsGet(LEGACY_PREFIX + L + '_run_state');
          var done = lsGet(LEGACY_PREFIX + L + '_done') === '1';
          var best = parseInt(lsGet(LEGACY_PREFIX + L + '_best_pct') || '0', 10) || 0;
          var answers = null;
          if (rsRaw) { try { var rs = JSON.parse(rsRaw); if (rs && Array.isArray(rs.answers)) answers = rs.answers; } catch (e) {} }
          if (answers) {
            var guess = answers.length === 21 ? 'studyskills/ss1' : 'medphys/pt1';
            var order = guess === 'medphys/pt1' ? ['medphys/pt1', 'studyskills/ss1'] : ['studyskills/ss1', 'medphys/pt1'];
            answers.forEach(function (a, i) {
              if (a === null || a === undefined) return;
              var placed = false;
              for (var k = 0; k < order.length && !placed; k++) {
                var bank = byKey[order[k]];
                var q = bank && bank.bank && bank.bank[L] && bank.bank[L][i];
                if (q && q.correct === a) {
                  add(order[k], idAt(bank, L, i));
                  placed = true;
                }
              }
              if (!placed) report.unmatched++;
            });
          }
          if (done || best >= 100) {
            var owner = answers && answers.length === 21 ? 'studyskills/ss1' : 'medphys/pt1';
            var b2 = byKey[owner];
            ((b2 && b2.bank && b2.bank[L]) || []).forEach(function (q, i) { add(owner, idAt(b2, L, i)); });
          }
        });
        Object.keys(report.solved).forEach(function (bk) {
          var st = load(bk);
          var now = Date.now();
          Object.keys(report.solved[bk]).forEach(function (id) { if (!st.solved[id]) st.solved[id] = now; });
          save(bk, st, { skipCloud: true });
        });
        lsSet(LEGACY_FLAG, sig);
        var counts = {};
        Object.keys(report.solved).forEach(function (bk) { counts[bk] = Object.keys(report.solved[bk]).length; });
        report.counts = counts;
        try { console.info('[StudyMigrate] legacy pt1_form_* progress copied', counts, 'unmatched answers skipped:', report.unmatched); } catch (e) {}
        if (global.StudyProgress && StudyProgress.syncFormsFromLocal) StudyProgress.syncFormsFromLocal();
        return report;
      });
  }

  /** Mastery v1 (position clearCount arrays per form) → v2 (per question id). */
  function migrateMastery() {
    var M = global.StudyMastery;
    if (!M || typeof M.getData !== 'function') return Promise.resolve({});
    var data = M.getData() || {};
    var dn = (M.getDnsa && M.getDnsa()) || {};
    var todo = Object.keys(data).filter(function (bk) {
      var b = data[bk];
      if (!b || !b.forms || typeof b.forms !== 'object' || !Object.keys(b.forms).length) return false;
      var sig = hash(JSON.stringify(b.forms) + JSON.stringify(dn[bk] || {}));
      return b.migratedSig !== sig;
    });
    if (!todo.length) return Promise.resolve({});
    return Promise.all(todo.map(function (bk) {
      return fetchPositionBank(bk).then(function (bank) {
        var b = data[bk];
        var counts = {};
        var skipped = 0;
        Object.keys(b.forms).forEach(function (L) {
          var cc = (b.forms[L] && b.forms[L].clearCount) || [];
          cc.forEach(function (n, i) {
            if (!(n | 0)) return;
            var id = idAt(bank, L, i);
            if (!id) { skipped++; return; }
            counts[id] = Math.max(counts[id] | 0, n | 0);
          });
        });
        var dIds = [];
        Object.keys(dn[bk] || {}).forEach(function (k) {
          var m = /^([A-Za-z]+)_(\d+)$/.exec(k);
          if (!m) return;
          var id = idAt(bank, m[1], parseInt(m[2], 10));
          if (id) dIds.push(id); else skipped++;
        });
        M.absorbLegacy(bk, counts, dIds);
        data[bk].migratedSig = hash(JSON.stringify(b.forms) + JSON.stringify(dn[bk] || {}));
        if (skipped) try { console.info('[StudyMigrate] mastery ' + bk + ': skipped ' + skipped + ' old entries with no matching question'); } catch (e) {}
        return { bk: bk, ids: Object.keys(counts).length, skipped: skipped };
      }).catch(function (e) {
        try { console.info('[StudyMigrate] mastery ' + bk + ' not migrated (bank unavailable)', e && e.message); } catch (x) {}
        return { bk: bk, error: true };
      });
    })).then(function (res) {
      M.save();
      return res;
    });
  }

  var running = null;
  function runAll() {
    if (running) return running;
    running = Promise.all([
      migrateLegacy().catch(function (e) { console.warn('legacy migration', e); }),
      migrateMastery().catch(function (e) { console.warn('mastery migration', e); })
    ]).then(function (r) { running = null; return r; }, function (e) { running = null; throw e; });
    return running;
  }

  global.StudyStore = {
    PREFIX: PREFIX,
    load: load,
    save: save,
    bankKeys: bankKeys,
    solvedSet: solvedSet,
    markSolved: markSolved,
    mergeEntries: mergeEntries,
    collectForCloud: collectForCloud,
    applyFromCloud: applyFromCloud,
    isCloudEntry: isCloudEntry,
    cloudKey: cloudKey,
    safeKey: safeKey,
    stripWires: stripWires,
    remapIds: remapIds,
    importFrom: importFrom
  };
  global.StudyMigrate = {
    migrateLegacy: migrateLegacy,
    migrateMastery: migrateMastery,
    runAll: runAll,
    fetchBank: fetchBank,
    fetchPositionBank: fetchPositionBank,
    LEGACY_FLAG: LEGACY_FLAG
  };
})(window);
