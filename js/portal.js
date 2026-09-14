/* Portal: subject tabs, material cards, locked online tiles */
(function () {
  const tabsEl = document.getElementById('subjectTabs');
  const cardsEl = document.getElementById('materialCards');
  const onlineEl = document.getElementById('onlineGrid');
  const labelEl = document.getElementById('materialsLabel');
  const toastHost = document.getElementById('toastHost');

  let catalog = null;
  let activeSubjectId = null;

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastHost.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  function lockIcon() {
    return '🔒';
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    catalog.subjects.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab' + (s.locked ? ' locked-tab' : '') + (s.id === activeSubjectId ? ' active' : '');
      btn.dataset.id = s.id;
      btn.innerHTML = s.locked
        ? `<span class="lock-ico">${lockIcon()}</span> ${escapeHtml(s.name)}`
        : escapeHtml(s.name);
      btn.addEventListener('click', () => {
        activeSubjectId = s.id;
        renderTabs();
        renderMaterials();
      });
      tabsEl.appendChild(btn);
    });
  }

  function renderMaterials() {
    const subject = catalog.subjects.find((s) => s.id === activeSubjectId);
    if (!subject) return;
    const extra = subject.subtitle ? ` — ${subject.subtitle}` : '';
    labelEl.textContent = subject.locked
      ? `${subject.name}${extra} (locked)`
      : `${subject.name}${extra} · materials`;

    cardsEl.innerHTML = '';
    const materials = subject.materials || [];
    if (!materials.length) {
      cardsEl.innerHTML = '<p class="status-msg">No materials listed.</p>';
      return;
    }

    materials.forEach((m) => {
      const locked = subject.locked || m.locked || !m.bank;
      if (locked) {
        const div = document.createElement('div');
        div.className = 'card locked';
        div.setAttribute('aria-disabled', 'true');
        div.innerHTML = `
          <span class="lock-badge" title="Locked">${lockIcon()}</span>
          <h3>${escapeHtml(m.title)}</h3>
          <p class="sub">${escapeHtml(m.subtitle || 'Locked')}</p>
          <span class="go">Unavailable</span>
        `;
        div.addEventListener('click', (e) => {
          e.preventDefault();
          toast('This material is locked');
        });
        cardsEl.appendChild(div);
      } else {
        const a = document.createElement('a');
        a.className = 'card';
        if (m.href) {
          const q = m.bank ? `?bank=${encodeURIComponent(m.bank)}` : '';
          // banks path is from site root; rich exam lives under exams/ so rewrite
          let bankParam = m.bank || '';
          if (m.href.startsWith('exams/') && bankParam.startsWith('banks/')) {
            bankParam = '../' + bankParam;
          }
          a.href = bankParam
            ? `${m.href}?bank=${encodeURIComponent(bankParam)}`
            : m.href;
        } else {
          a.href = `exam.html?bank=${encodeURIComponent(m.bank)}`;
        }
        a.innerHTML = `
          <h3>${escapeHtml(m.title)}</h3>
          <p class="sub">${escapeHtml(m.subtitle || '')}</p>
          <span class="go">Open exam →</span>
        `;
        cardsEl.appendChild(a);
      }
    });
  }

  function renderOnline() {
    onlineEl.innerHTML = '';
    (catalog.online || []).forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'online-tile';
      btn.innerHTML = `
        <span class="lock-mini">${lockIcon()}</span>
        <span class="ico">${item.icon || '•'}</span>
        <span class="ttl">${escapeHtml(item.title)}</span>
      `;
      btn.addEventListener('click', () => toast('Online features coming soon'));
      onlineEl.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fetch('data/catalog.json')
    .then((r) => {
      if (!r.ok) throw new Error('catalog ' + r.status);
      return r.json();
    })
    .then((data) => {
      catalog = data;
      const firstOpen = catalog.subjects.find((s) => !s.locked) || catalog.subjects[0];
      activeSubjectId = firstOpen ? firstOpen.id : null;
      renderTabs();
      renderMaterials();
      renderOnline();
    })
    .catch((err) => {
      cardsEl.innerHTML = `<p class="status-msg error">Could not load catalog.json. Serve over HTTP (not file://). ${escapeHtml(err.message)}</p>`;
    });
})();
