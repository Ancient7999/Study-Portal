/* Study Portal — compact confirm popup, anchored top-centre:
   StudyConfirm.ask({title, text, confirm, cancel, danger, icon}) → Promise<boolean>.
   No backdrop. Esc, a click outside or a choice closes it. Enter confirms only while the
   confirm button has focus; destructive asks (danger) start with the focus on cancel.
   Tab stays inside the popup while it is open. */
(function (global) {
  let open = null;
  const ICONS = {
    leave: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5v-2H6V6h4V4Zm5.6 3.4L14.2 8.8l2.2 2.2H9v2h7.4l-2.2 2.2 1.4 1.4L20.2 12l-4.6-4.6Z"/>',
    warn: '<path d="M12 3 1.8 20.5h20.4L12 3Zm0 4.2 6.8 11.3H5.2L12 7.2ZM11 10v4.5h2V10h-2Zm0 5.5v2h2v-2h-2Z"/>',
    edit: '<path d="M4 17.2V20h2.8l8.3-8.3-2.8-2.8L4 17.2ZM17.7 9.1a1 1 0 0 0 0-1.4l-1.4-1.4a1 1 0 0 0-1.4 0l-1.1 1.1 2.8 2.8 1.1-1.1Z"/>',
    info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/>'
  };
  function ask(o) {
    o = o || {};
    if (open) open.finish(false);
    return new Promise((resolve) => {
      const danger = !!o.danger;
      const ov = document.createElement('div');
      ov.className = 'study-confirm';
      ov.id = 'studyConfirm';
      ov.innerHTML =
        '<div class="study-confirm-card' + (danger ? ' is-danger' : '') + '" role="alertdialog" aria-modal="false" aria-labelledby="studyConfirmTitle" aria-describedby="studyConfirmText">' +
        '<span class="sc-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" focusable="false">' + (ICONS[o.icon] || (danger ? ICONS.warn : ICONS.info)) + '</svg></span>' +
        '<div class="sc-body"><h3 id="studyConfirmTitle"></h3><p id="studyConfirmText" class="study-confirm-text"></p></div>' +
        '<div class="sc-actions"><button type="button" class="sc-btn" id="studyConfirmNo"></button>' +
        '<button type="button" class="sc-btn ' + (danger ? 'sc-danger' : 'sc-primary') + '" id="studyConfirmYes"></button></div></div>';
      ov.querySelector('#studyConfirmTitle').textContent = o.title || 'Are you sure?';
      ov.querySelector('#studyConfirmText').textContent = o.text || '';
      ov.querySelector('#studyConfirmText').hidden = !o.text;
      const yes = ov.querySelector('#studyConfirmYes');
      const no = ov.querySelector('#studyConfirmNo');
      yes.textContent = o.confirm || 'Confirm';
      no.textContent = o.cancel || 'Cancel';
      const prev = document.activeElement;
      let closing = false;
      const finish = (v) => {
        if (closing || !ov.isConnected) return;
        closing = true;
        global.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onOutside, true);
        open = null;
        ov.classList.add('leaving');
        const gone = () => { if (ov.isConnected) ov.remove(); };
        const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) gone(); else setTimeout(gone, 160);
        try { if (prev && prev.focus && prev.isConnected) prev.focus({ preventScroll: true }); } catch (e) {}
        resolve(!!v);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(false); return; }
        if (e.key === 'Enter') {
          // Enter confirms only on the confirm button; on cancel it cancels; anywhere else it does nothing
          e.preventDefault(); e.stopImmediatePropagation();
          if (document.activeElement === yes) finish(true);
          else if (document.activeElement === no) finish(false);
          return;
        }
        if (e.key === 'Tab') {
          // light focus trap between the two buttons
          e.preventDefault(); e.stopImmediatePropagation();
          (document.activeElement === no ? yes : no).focus();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          if (document.activeElement === yes || document.activeElement === no) { e.preventDefault(); (document.activeElement === no ? yes : no).focus(); }
        }
      };
      const onOutside = (e) => { if (!ov.contains(e.target)) finish(false); };
      global.addEventListener('keydown', onKey, true);
      yes.onclick = () => finish(true);
      no.onclick = () => finish(false);
      document.body.appendChild(ov);
      // the click that opened the popup must not close it
      setTimeout(() => { if (ov.isConnected && !closing) document.addEventListener('pointerdown', onOutside, true); }, 0);
      open = { finish };
      setTimeout(() => { if (!ov.isConnected || closing) return; try { (danger ? no : yes).focus({ preventScroll: true }); } catch (e) {} }, 0);
    });
  }
  global.StudyConfirm = { ask, isOpen: () => !!open };
})(window);
