/* Study Portal — themed confirm dialog: StudyConfirm.ask({title, text, confirm, cancel}) → Promise<boolean>.
   Enter confirms, Esc cancels, a click on the backdrop cancels. */
(function (global) {
  let open = null;
  function ask(o) {
    o = o || {};
    if (open) open.finish(false);
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'modal-overlay show study-confirm';
      ov.id = 'studyConfirm';
      ov.innerHTML =
        '<div class="modal-card study-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="studyConfirmTitle" aria-describedby="studyConfirmText">' +
        '<h3 id="studyConfirmTitle"></h3><p id="studyConfirmText" class="study-confirm-text"></p>' +
        '<div class="modal-actions"><button type="button" class="btn-ghost" id="studyConfirmNo"></button>' +
        '<button type="button" class="btn-gold" id="studyConfirmYes"></button></div></div>';
      ov.querySelector('#studyConfirmTitle').textContent = o.title || 'Are you sure?';
      ov.querySelector('#studyConfirmText').textContent = o.text || '';
      ov.querySelector('#studyConfirmText').hidden = !o.text;
      ov.querySelector('#studyConfirmYes').textContent = o.confirm || 'Confirm';
      ov.querySelector('#studyConfirmNo').textContent = o.cancel || 'Cancel';
      let z = 80;
      document.querySelectorAll('.modal-overlay.show').forEach((m) => { const v = parseInt(getComputedStyle(m).zIndex, 10); if (v >= z) z = v + 1; });
      ov.style.zIndex = String(Math.max(z, 1200));
      const prev = document.activeElement;
      const finish = (v) => {
        if (!ov.isConnected) return;
        global.removeEventListener('keydown', onKey, true);
        ov.remove();
        open = null;
        try { if (prev && prev.focus) prev.focus(); } catch (e) {}
        resolve(!!v);
      };
      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(false); }
      };
      global.addEventListener('keydown', onKey, true);
      ov.addEventListener('click', (e) => { if (e.target === ov) finish(false); });
      ov.querySelector('#studyConfirmYes').onclick = () => finish(true);
      ov.querySelector('#studyConfirmNo').onclick = () => finish(false);
      document.body.appendChild(ov);
      open = { finish };
      setTimeout(() => { const y = ov.querySelector('#studyConfirmYes'); if (y && ov.isConnected) y.focus(); }, 0);
    });
  }
  global.StudyConfirm = { ask, isOpen: () => !!open };
})(window);
