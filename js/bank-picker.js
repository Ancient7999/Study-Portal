/* Study Portal — Subject → Test → Set picker for lobbies and party seats.
   The choices mirror the Practice page: one entry per portal card (test) and, inside it,
   exactly the set cards Practice shows (js/study-sets.js). Stored values stay bank|form for
   sets that are one whole bank form; other sets add the Practice card id: bank|form|card. */
(function (global) {
  const FORMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const DEFAULT_BANK = 'banks/medphys/pt1.json';
  let catalogCache = null;
  let catalogPromise = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function loadCatalog() {
    if (catalogCache) return catalogCache;
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch('data/catalog.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('catalog HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        catalogCache = data || { subjects: [] };
        return catalogCache;
      })
      .catch((e) => {
        catalogPromise = null;
        console.warn('bank-picker catalog', e);
        catalogCache = { subjects: [{ id: 'medphys', name: 'Medical Physics', locked: false, materials: [{ id: 'pt1', title: 'Periodic Test 1', bank: DEFAULT_BANK, locked: false }] }] };
        return catalogCache;
      });
    return catalogPromise;
  }

  /* kept for older callers: a material's own forms list, else A–H */
  function formsOf(m) {
    if (m && Array.isArray(m.forms) && m.forms.length) {
      return m.forms.map((f) => (typeof f === 'string' ? { id: f, title: 'Form ' + f } : { id: String(f.id), title: String(f.title || 'Form ' + f.id) }));
    }
    return FORMS.map((f) => ({ id: f, title: 'Form ' + f }));
  }

  function parseValue(val) {
    const parts = String(val || '').split('|');
    const card = parts.slice(2).join('|');
    return { bank: parts[0] || DEFAULT_BANK, form: (parts[1] || 'A').toUpperCase(), card: card || null };
  }

  function encodeValue(bank, form, card) {
    return String(bank || DEFAULT_BANK) + '|' + String(form || 'A').toUpperCase() + (card ? '|' + card : '');
  }

  function tests(catalog) {
    return global.StudySets ? StudySets.tests(catalog) : [];
  }

  /* the Practice test a stored bank belongs to (lecture banks belong to their test) */
  function testForBank(catalog, bank) {
    return (
      tests(catalog).find((t) => (t.lectures ? t.lectures.some((l) => l && l.bank === bank) : t.material.bank === bank)) || null
    );
  }

  async function setsFor(test) {
    if (!test || !global.StudySets) return [];
    try {
      return await StudySets.setsOf(test);
    } catch (e) {
      console.warn('bank-picker sets', e);
      return [];
    }
  }

  function sameChoice(set, v) {
    return set.bank === v.bank && (set.card || null) === (v.card || null) && (set.card ? true : set.form === String(v.form || 'A').toUpperCase());
  }

  /* "Subject · Test · Set" for a stored choice, from the Practice cards */
  async function describe(bank, form, card) {
    const catalog = await loadCatalog();
    const t = testForBank(catalog, bank);
    if (!t) return { subjectName: '', testTitle: (String(bank || '').split('/').pop() || 'Bank').replace('.json', ''), setLabel: 'Form ' + (form || 'A') };
    const sets = await setsFor(t);
    const hit = sets.find((s) => sameChoice(s, { bank, form, card }));
    return { subjectName: t.subjectName, testTitle: t.title, setLabel: hit ? hit.label : 'Form ' + (form || 'A'), set: hit || null };
  }

  function labelFor(bank, form, catalog) {
    const t = testForBank(catalog || catalogCache || { subjects: [] }, bank);
    if (!t) return 'Form ' + (form || 'A');
    return t.subjectName + ' · ' + t.title;
  }

  function choiceOf(test, set) {
    if (!test || !set) return null;
    return {
      bank: set.bank,
      form: set.form,
      card: set.card || null,
      subjectName: test.subjectName,
      testTitle: test.title,
      setLabel: set.label,
      label: test.title + ' · ' + set.label,
      total: set.total,
      party: set.party
    };
  }

  function summaryText(set) {
    if (!set) return '';
    if (!set.party) return 'This set has no multiple-choice questions, so it cannot be played in a lobby.';
    if (set.party === set.total) return set.total + ' questions, all multiple choice.';
    return set.party + ' of ' + set.total + ' questions play in the lobby. Lobby quizzes use the multiple-choice ones.';
  }

  /**
   * Mount Subject → Test → Set selects into `mountEl`.
   * opts: { value:{bank,form,card}, onChange(bank, form, encoded, choice), idPrefix, compact }
   */
  function mount(mountEl, opts) {
    opts = opts || {};
    if (!mountEl) return null;
    const prefix = opts.idPrefix || 'bp';
    mountEl.innerHTML =
      '<div class="bank-picker' + (opts.compact ? ' bank-picker-compact' : '') + '">' +
      '<div class="bank-picker-field"><label class="bank-picker-label" for="' + prefix + 'Subject">Subject</label>' +
      '<select id="' + prefix + 'Subject" class="chat-tool-input bank-picker-subject"></select></div>' +
      '<div class="bank-picker-field"><label class="bank-picker-label" for="' + prefix + 'Test">Test</label>' +
      '<select id="' + prefix + 'Test" class="chat-tool-input bank-picker-test"></select></div>' +
      '<div class="bank-picker-field bank-picker-field-wide"><label class="bank-picker-label" for="' + prefix + 'Bank">Set</label>' +
      '<select id="' + prefix + 'Bank" class="chat-tool-input bank-picker-bank" disabled><option>Loading sets…</option></select></div>' +
      '<p class="bank-picker-summary" id="' + prefix + 'Summary" aria-live="polite"></p>' +
      '</div>';
    const subjSel = mountEl.querySelector('#' + prefix + 'Subject');
    const testSel = mountEl.querySelector('#' + prefix + 'Test');
    const setSel = mountEl.querySelector('#' + prefix + 'Bank');
    const summary = mountEl.querySelector('#' + prefix + 'Summary');
    let catalog = { subjects: [] };
    let all = [];
    let sets = [];
    let current = null;
    let ready = false;
    let token = 0;
    let whenReady = null;

    function curTest() {
      return all.find((t) => t.key === testSel.value) || null;
    }
    function curSet() {
      return sets[Number(setSel.value)] || null;
    }
    function emit() {
      current = choiceOf(curTest(), curSet());
      summary.textContent = opts.allTypes ? (curSet() ? curSet().total + ' questions, every type, the same as Practice.' : '') : summaryText(curSet());
      if (!opts.onChange || !ready || !current) return;
      opts.onChange(current.bank, current.form, encodeValue(current.bank, current.form, current.card), current);
    }
    function fillSubjects(subjectId) {
      const subs = [];
      all.forEach((t) => {
        if (!subs.some((s) => s.id === t.subjectId)) subs.push({ id: t.subjectId, name: t.subjectName });
      });
      subjSel.innerHTML = subs.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('');
      subjSel.value = subs.some((s) => s.id === subjectId) ? subjectId : subs[0] ? subs[0].id : '';
    }
    function fillTests(testKey) {
      const list = all.filter((t) => t.subjectId === subjSel.value);
      testSel.innerHTML = list.map((t) => '<option value="' + esc(t.key) + '">' + esc(t.title) + '</option>').join('');
      testSel.value = list.some((t) => t.key === testKey) ? testKey : list[0] ? list[0].key : '';
    }
    async function fillSets(prefer) {
      const my = ++token;
      setSel.disabled = true;
      setSel.innerHTML = '<option>Loading sets…</option>';
      summary.textContent = '';
      const got = await setsFor(curTest());
      if (my !== token) return;
      sets = got;
      setSel.innerHTML = sets.length
        ? sets.map((s, i) => '<option value="' + i + '"' + (s.party || opts.allTypes ? '' : ' disabled') + '>' + esc(s.label) + (s.party || opts.allTypes ? '' : ' · no multiple choice') + '</option>').join('')
        : '<option value="">No playable sets</option>';
      let idx = prefer ? sets.findIndex((s) => sameChoice(s, prefer)) : -1;
      if (idx < 0) idx = sets.findIndex((s) => opts.allTypes || s.party > 0);
      setSel.value = idx >= 0 ? String(idx) : '';
      setSel.disabled = !sets.length;
      emit();
    }
    async function select(v) {
      const t = v && v.bank ? testForBank(catalog, v.bank) : null;
      fillSubjects(t ? t.subjectId : subjSel.value || (all[0] && all[0].subjectId));
      fillTests(t ? t.key : null);
      await fillSets(v && v.bank ? v : null);
    }

    subjSel.onchange = () => {
      fillTests(null);
      fillSets(null);
    };
    testSel.onchange = () => fillSets(null);
    setSel.onchange = () => emit();

    whenReady = loadCatalog().then(async (c) => {
      catalog = c;
      all = tests(c);
      await select(opts.value && opts.value.bank ? opts.value : typeof opts.value === 'string' ? parseValue(opts.value) : null);
      ready = true;
      if (opts.onChange && current) emit();
    });

    return {
      ready: () => whenReady,
      getValue: () => (current ? { bank: current.bank, form: current.form, card: current.card } : parseValue('')),
      getChoice: () => current,
      getEncoded: () => (current ? encodeValue(current.bank, current.form, current.card) : ''),
      setValue: async (bank, form, card) => {
        await whenReady;
        await select({ bank, form, card });
      },
      destroy: () => {
        mountEl.innerHTML = '';
      },
      refresh: async () => {
        await whenReady;
        await select(current);
      }
    };
  }

  /** <option> list HTML from the Practice sets. opts.subjectId limits it to one subject
      (then one optgroup per test); otherwise one optgroup per subject. */
  async function optionsHtml(opts) {
    opts = opts || {};
    const catalog = await loadCatalog();
    const list = tests(catalog).filter((t) => !opts.subjectId || t.subjectId === opts.subjectId);
    const groups = [];
    for (const t of list) {
      const sets = await setsFor(t);
      const html = sets
        .map((s) => '<option value="' + esc(encodeValue(s.bank, s.form, s.card)) + '"' + (s.party || opts.allTypes ? '' : ' disabled') + '>' + esc(opts.subjectId ? s.label : t.title + ' · ' + s.label) + '</option>')
        .join('');
      if (!html) continue;
      const label = opts.subjectId ? t.title : t.subjectName;
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.html += html;
      else groups.push({ label, html });
    }
    if (!groups.length) return '<option value="' + DEFAULT_BANK + '|A">Medical Physics · Periodic Test 1</option>';
    return groups.map((g) => '<optgroup label="' + esc(g.label) + '">' + g.html + '</optgroup>').join('');
  }

  global.StudyBankPicker = {
    FORMS,
    loadCatalog,
    mount,
    parseValue,
    encodeValue,
    labelFor,
    describe,
    testForBank: (bank) => testForBank(catalogCache, bank),
    formsOf,
    optionsHtml,
    summaryText
  };
})(window);
