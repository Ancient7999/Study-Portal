/* Study Portal — Practice set cards as data (shared by lobbies, party quiz and screen share)
   Mirrors the Practice page exactly (js/quiz-engine.js buildAllQuestions / buildCards /
   buildGroupedCards / ingestLectureSet), without touching the DOM:
     - tests(catalog)            → every playable Practice card per subject (portal cards)
     - setsOf(material, data)    → the set cards Practice shows inside one test
     - poolFor(data, cardId)     → the questions of one set card
     - choiceFor(test, set)      → {bank, form, card, label} stored on lobbies, seats and panes
   A set that is exactly one whole bank form is stored as bank + form with no card, so banks
   that genuinely have forms (English Periodic Test 1) keep their old bank|form values. */
(function (global) {
  const SPLIT_OVER = 100;
  const CHUNK_TARGET = 40;
  const dataCache = {};

  function qid(q, i) {
    return String(q && (q.id != null ? q.id : 'q_' + String(q.q || '').slice(0, 48) + '_' + i));
  }
  function catLabel(c) {
    return String(c).replace(/_/g, ' ');
  }
  function formsOfData(data) {
    return (data && (data.forms || Object.keys(data.bank || {}))) || [];
  }

  /* same flat list and id rules as the Practice page */
  function allQuestions(data) {
    const out = [];
    const seen = {};
    formsOfData(data).forEach((letter) => {
      ((data.bank || {})[letter] || []).forEach((q, i) => {
        const copy = Object.assign({}, q);
        copy.__form = letter;
        copy.__pos = i;
        let id = qid(q, i);
        if (seen[id]) {
          seen[id]++;
          id = id + '~' + seen[id];
        } else seen[id] = 1;
        copy.__id = id;
        out.push(copy);
      });
    });
    return out;
  }

  function buildCards(all, groups) {
    if (groups && groups.length) {
      const norm = (c) => catLabel(c == null || c === '' ? 'general' : c);
      const cards = [];
      const taken = new Set();
      groups.forEach((g, i) => {
        const set = new Set((g.cats || []).map(norm));
        const fset = new Set((g.forms || []).map(String));
        const pool = all.filter((q) => !taken.has(q.__id) && (set.has(norm(q.cat)) || fset.has(String(q.__form))));
        pool.forEach((q) => taken.add(q.__id));
        cards.push({ id: 'grp:' + (g.id || g.title || 'card' + (i + 1)), label: String(g.title || g.id || 'Set ' + (i + 1)), pool });
      });
      const rest = all.filter((q) => !taken.has(q.__id));
      if (rest.length) buildCards(rest, null).forEach((c) => cards.push(c));
      return cards;
    }
    const cats = [];
    const byCat = {};
    all.forEach((q) => {
      const c = q.cat == null || q.cat === '' ? 'general' : String(q.cat);
      if (!byCat[c]) {
        byCat[c] = [];
        cats.push(c);
      }
      byCat[c].push(q);
    });
    const cards = [];
    if (cats.length === 1 && byCat[cats[0]].length > SPLIT_OVER) {
      const c = cats[0];
      const list = byCat[c];
      const n = list.length;
      const parts = Math.ceil(n / CHUNK_TARGET);
      const base = Math.floor(n / parts);
      const extra = n % parts;
      let at = 0;
      for (let k = 0; k < parts; k++) {
        const size = base + (k < extra ? 1 : 0);
        cards.push({ id: 'cat:' + c + '#' + (k + 1), label: catLabel(c) + ' · Part ' + (k + 1) + ' (' + (at + 1) + '–' + (at + size) + ')', pool: list.slice(at, at + size) });
        at += size;
      }
    } else {
      cats.forEach((c) => cards.push({ id: 'cat:' + c, label: catLabel(c), pool: byCat[c] }));
    }
    return cards;
  }

  /* the questions party mode can show: plain multiple choice */
  function isPartyQuestion(q) {
    const t = q && q.type;
    return !!q && (!t || t === 'mcq') && !q.steps && !q.correct_pairs && Array.isArray(q.options) && typeof q.correct === 'number';
  }

  function groupsFor(material, data) {
    if (material && Array.isArray(material.cards) && material.cards.length) return material.cards;
    if (data && Array.isArray(data.cards) && data.cards.length) return data.cards;
    return null;
  }

  /* one card's form when it is exactly one whole bank form, else null */
  function wholeForm(data, pool) {
    if (!pool.length) return null;
    const f = pool[0].__form;
    if (!pool.every((q) => q.__form === f)) return null;
    return ((data.bank || {})[f] || []).length === pool.length ? String(f) : null;
  }

  function summarize(card, data, extra) {
    const party = card.pool.filter(isPartyQuestion).length;
    const form = wholeForm(data, card.pool);
    return Object.assign(
      {
        id: card.id,
        label: card.label,
        total: card.pool.length,
        party: party,
        form: form || String((card.pool[0] && card.pool[0].__form) || formsOfData(data)[0] || 'A'),
        card: form ? null : card.id
      },
      extra || {}
    );
  }

  /* Practice cards on the portal: open subject, not hidden, not locked, has a quiz */
  function tests(catalog) {
    const out = [];
    ((catalog && catalog.subjects) || []).forEach((s) => {
      if (!s || s.locked) return;
      (s.materials || []).forEach((m) => {
        if (!m || m.hidden === true || m.locked) return;
        const lectures = Array.isArray(m.lectures) && m.lectures.length ? m.lectures : null;
        if (!m.bank && !lectures) return;
        out.push({
          key: s.id + '/' + m.id,
          subjectId: s.id,
          subjectName: s.name || s.id,
          id: m.id,
          title: m.title || m.id,
          material: m,
          lectures: lectures
        });
      });
    });
    return out;
  }

  async function fetchData(path) {
    if (!dataCache[path]) {
      dataCache[path] = fetch(path, { cache: 'no-cache' })
        .then((r) => {
          if (!r.ok) throw new Error('bank HTTP ' + r.status);
          return r.json();
        })
        .catch((e) => {
          delete dataCache[path];
          throw e;
        });
    }
    return dataCache[path];
  }

  /* the set cards Practice shows for one test, each with its stored choice fields */
  async function setsOf(test) {
    if (!test) return [];
    if (test.lectures) {
      const out = [];
      for (let i = 0; i < test.lectures.length; i++) {
        const e = test.lectures[i];
        if (!e || !e.bank || (e.status || 'ready') !== 'ready') continue; // Coming Soon cards cannot be played
        let data;
        try {
          data = await fetchData(e.bank);
        } catch (err) {
          continue;
        }
        const card = { id: 'lec:' + (e.id || 'l' + (i + 1)), label: String(e.title || 'Lecture set ' + (i + 1)), pool: allQuestions(data) };
        const sum = summarize(card, data, { bank: e.bank });
        // a lecture card is its whole bank (every form); keep the card unless that is one form
        out.push(sum);
      }
      return out;
    }
    const data = await fetchData(test.material.bank);
    return buildCards(allQuestions(data), groupsFor(test.material, data)).map((c) => summarize(c, data, { bank: test.material.bank }));
  }

  /* questions of one stored choice (bank + form + optional card), in bank order */
  function poolFor(data, form, cardId, material) {
    const all = allQuestions(data);
    if (cardId) {
      if (String(cardId).indexOf('lec:') === 0) return all;
      const hit = buildCards(all, groupsFor(material, data)).find((c) => c.id === cardId);
      if (hit) return hit.pool;
    }
    const f = String(form || '').toUpperCase();
    let qs = all.filter((q) => String(q.__form).toUpperCase() === f);
    if (!qs.length) {
      const first = formsOfData(data)[0];
      qs = all.filter((q) => q.__form === first);
    }
    return qs;
  }

  function materialForBank(catalog, bank) {
    let hit = null;
    ((catalog && catalog.subjects) || []).forEach((s) => {
      (s.materials || []).forEach((m) => {
        if (m && m.bank === bank) hit = m;
      });
    });
    return hit;
  }

  global.StudySets = {
    allQuestions,
    buildCards,
    isPartyQuestion,
    tests,
    setsOf,
    poolFor,
    fetchData,
    materialForBank,
    _cache: dataCache
  };
})(window);
