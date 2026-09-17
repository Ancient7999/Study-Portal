/* Study Portal — Subject → question-bank (form) picker */
(function (global) {
  const FORMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  let catalogCache = null;
  let catalogPromise = null;

  function toast(msg) {
    if (typeof showToast === 'function') showToast(msg, 2400);
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
        catalogCache = {
          subjects: [
            {
              id: 'medphys',
              name: 'Medical Physics',
              locked: false,
              materials: [
                {
                  id: 'pt1',
                  title: 'Periodic Test 1',
                  bank: 'banks/medphys/pt1.json',
                  locked: false
                }
              ]
            }
          ]
        };
        return catalogCache;
      });
    return catalogPromise;
  }

  function openSubjects(catalog) {
    return (catalog.subjects || []).filter((s) => !s.locked);
  }

  function openMaterials(subject) {
    return (subject.materials || []).filter((m) => !m.locked && m.bank);
  }

  function parseValue(val) {
    const parts = String(val || '').split('|');
    return {
      bank: parts[0] || 'banks/medphys/pt1.json',
      form: (parts[1] || 'A').toUpperCase()
    };
  }

  function encodeValue(bank, form) {
    return String(bank || 'banks/medphys/pt1.json') + '|' + String(form || 'A').toUpperCase();
  }

  function labelFor(bank, form, catalog) {
    let subjectName = '';
    let materialTitle = '';
    (catalog.subjects || []).forEach((s) => {
      (s.materials || []).forEach((m) => {
        if (m.bank === bank) {
          subjectName = s.name || '';
          materialTitle = m.title || m.id || '';
        }
      });
    });
    const mat = materialTitle || bank.split('/').pop() || 'Bank';
    return (subjectName ? subjectName + ' · ' : '') + mat + ' · Form ' + (form || 'A');
  }

  /**
   * Mount a Subject → Bank/Form control into `mountEl`.
   * opts: { value, onChange(bank, form), idPrefix, compact }
   * Returns { getValue, setValue, destroy, refresh }
   */
  function mount(mountEl, opts) {
    opts = opts || {};
    if (!mountEl) return null;
    const prefix = opts.idPrefix || 'bp';
    mountEl.innerHTML =
      '<div class="bank-picker' +
      (opts.compact ? ' bank-picker-compact' : '') +
      '">' +
      '<label class="bank-picker-label" for="' +
      prefix +
      'Subject">Subject</label>' +
      '<select id="' +
      prefix +
      'Subject" class="chat-tool-input bank-picker-subject"></select>' +
      '<label class="bank-picker-label" for="' +
      prefix +
      'Bank">Question bank</label>' +
      '<select id="' +
      prefix +
      'Bank" class="chat-tool-input bank-picker-bank"></select>' +
      '</div>';

    const subjSel = mountEl.querySelector('#' + prefix + 'Subject');
    const bankSel = mountEl.querySelector('#' + prefix + 'Bank');
    let catalog = { subjects: [] };
    let ready = false;

    function emit() {
      if (!opts.onChange || !ready) return;
      const v = parseValue(bankSel.value);
      opts.onChange(v.bank, v.form, encodeValue(v.bank, v.form));
    }

    function fillBanks(subjectId, prefer) {
      const subject = openSubjects(catalog).find((s) => s.id === subjectId) || openSubjects(catalog)[0];
      const mats = subject ? openMaterials(subject) : [];
      const options = [];
      mats.forEach((m) => {
        FORMS.forEach((f) => {
          options.push({
            value: encodeValue(m.bank, f),
            label: (m.title || m.id) + ' · Form ' + f
          });
        });
      });
      if (!options.length) {
        options.push({ value: encodeValue('banks/medphys/pt1.json', 'A'), label: 'PT1 · Form A' });
      }
      bankSel.innerHTML = options
        .map((o) => '<option value="' + o.value + '">' + o.label + '</option>')
        .join('');
      if (prefer) {
        const hit = options.find((o) => o.value === prefer);
        bankSel.value = hit ? prefer : options[0].value;
      } else {
        bankSel.value = options[0].value;
      }
    }

    function fillSubjects(preferVal) {
      const subjects = openSubjects(catalog);
      subjSel.innerHTML = subjects
        .map((s) => '<option value="' + s.id + '">' + (s.name || s.id) + '</option>')
        .join('');
      if (!subjects.length) {
        subjSel.innerHTML = '<option value="medphys">Medical Physics</option>';
      }
      let preferSubject = subjects[0] && subjects[0].id;
      if (preferVal) {
        const parsed = parseValue(preferVal);
        subjects.forEach((s) => {
          if ((s.materials || []).some((m) => m.bank === parsed.bank)) preferSubject = s.id;
        });
      }
      subjSel.value = preferSubject || 'medphys';
      fillBanks(subjSel.value, preferVal);
    }

    subjSel.onchange = () => {
      fillBanks(subjSel.value, null);
      emit();
    };
    bankSel.onchange = () => emit();

    const api = {
      getValue: () => parseValue(bankSel.value),
      getEncoded: () => bankSel.value,
      setValue: (bank, form) => {
        const enc = encodeValue(bank, form);
        fillSubjects(enc);
        emit();
      },
      destroy: () => {
        mountEl.innerHTML = '';
      },
      refresh: async () => {
        catalog = await loadCatalog();
        const cur = bankSel.value;
        fillSubjects(cur || (opts.value ? encodeValue(opts.value.bank, opts.value.form) : null));
        ready = true;
      }
    };

    loadCatalog().then((c) => {
      catalog = c;
      const initial =
        opts.value && opts.value.bank
          ? encodeValue(opts.value.bank, opts.value.form)
          : typeof opts.value === 'string'
            ? opts.value
            : null;
      fillSubjects(initial);
      ready = true;
      if (opts.onChange && initial) {
        const v = parseValue(bankSel.value);
        opts.onChange(v.bank, v.form, encodeValue(v.bank, v.form));
      }
    });

    return api;
  }

  /** Build <option> list HTML for a plain select (subject grouped). */
  async function optionsHtml() {
    const catalog = await loadCatalog();
    const chunks = [];
    openSubjects(catalog).forEach((s) => {
      const mats = openMaterials(s);
      if (!mats.length) return;
      chunks.push('<optgroup label="' + (s.name || s.id) + '">');
      mats.forEach((m) => {
        FORMS.forEach((f) => {
          chunks.push(
            '<option value="' +
              encodeValue(m.bank, f) +
              '">' +
              (m.title || m.id) +
              ' · Form ' +
              f +
              '</option>'
          );
        });
      });
      chunks.push('</optgroup>');
    });
    if (!chunks.length) {
      return '<option value="banks/medphys/pt1.json|A">Medical Physics · PT1 · Form A</option>';
    }
    return chunks.join('');
  }

  global.StudyBankPicker = {
    FORMS,
    loadCatalog,
    mount,
    parseValue,
    encodeValue,
    labelFor,
    optionsHtml
  };
})(window);
