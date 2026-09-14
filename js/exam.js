/* Exam player: fetch bank, Forms A–H, lock-in wrong until correct, localStorage, break modal */
(function () {
  const params = new URLSearchParams(location.search);
  const bankPath = params.get('bank');

  const loadStatus = document.getElementById('loadStatus');
  const examTitle = document.getElementById('examTitle');
  const examSub = document.getElementById('examSub');
  const examBadge = document.getElementById('examBadge');
  const hubView = document.getElementById('hubView');
  const quizView = document.getElementById('quizView');
  const doneView = document.getElementById('doneView');
  const hubGrid = document.getElementById('hubGrid');
  const restartBtn = document.getElementById('restartBtn');
  const backHubBtn = document.getElementById('backHubBtn');
  const progressPill = document.getElementById('progressPill');
  const quizPanel = document.getElementById('quizPanel');
  const qCat = document.getElementById('qCat');
  const qText = document.getElementById('qText');
  const optionsEl = document.getElementById('options');
  const explainEl = document.getElementById('explain');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const doneTitle = document.getElementById('doneTitle');
  const doneMsg = document.getElementById('doneMsg');
  const doneHubBtn = document.getElementById('doneHubBtn');
  const toastHost = document.getElementById('toastHost');

  const pomoDock = document.getElementById('pomodoroDock');
  const pomoPhase = document.getElementById('pomoPhase');
  const pomoClock = document.getElementById('pomoClock');
  const pomoToggle = document.getElementById('pomoToggle');
  const pomoSkip = document.getElementById('pomoSkip');
  const breakModal = document.getElementById('breakModal');
  const breakModalClock = document.getElementById('breakModalClock');
  const breakCloseBtn = document.getElementById('breakCloseBtn');

  let bank = null;
  let storageKey = '';
  let progress = {}; // form -> { answered: {qi: {wrong:[], correct:true}}, bestPct, currentPct }

  let currentForm = null;
  let qIndex = 0;
  let questions = [];

  const LETTERS = ['A', 'B', 'C', 'D'];

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastHost.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 320);
    }, 2400);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showView(name) {
    [hubView, quizView, doneView].forEach((v) => v.classList.remove('active'));
    if (name === 'hub') hubView.classList.add('active');
    if (name === 'quiz') quizView.classList.add('active');
    if (name === 'done') doneView.classList.add('active');
  }

  function defaultFormState() {
    return { answered: {}, bestPct: 0, currentPct: 0 };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) progress = JSON.parse(raw);
      else progress = {};
    } catch (e) {
      progress = {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (e) { /* ignore quota */ }
  }

  function formState(letter) {
    if (!progress[letter]) progress[letter] = defaultFormState();
    return progress[letter];
  }

  function computePct(letter) {
    const st = formState(letter);
    const total = (bank.bank[letter] || []).length || bank.formSize || 20;
    let correct = 0;
    Object.keys(st.answered).forEach((k) => {
      if (st.answered[k] && st.answered[k].correct) correct++;
    });
    const pct = total ? Math.round((100 * correct) / total) : 0;
    st.currentPct = pct;
    if (pct > (st.bestPct || 0)) st.bestPct = pct;
    return { pct, best: st.bestPct || 0, correct, total };
  }

  function displayPct(letter) {
    const { pct, best } = computePct(letter);
    // Show best for hub (keeps 100% after restart of current run if best was 100)
    return Math.max(pct, best);
  }

  function renderHub() {
    const forms = bank.forms || Object.keys(bank.bank || {});
    hubGrid.innerHTML = '';
    forms.forEach((letter) => {
      const shown = displayPct(letter);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'form-card' + (shown >= 100 ? ' done' : '');
      btn.innerHTML = `
        <div class="letter">Form ${escapeHtml(letter)}</div>
        <div class="pct">${shown}%</div>
      `;
      btn.addEventListener('click', () => startForm(letter));
      hubGrid.appendChild(btn);
    });
    saveProgress();
  }

  function startForm(letter) {
    currentForm = letter;
    questions = bank.bank[letter] || [];
    if (!questions.length) {
      toast('No questions in this form');
      return;
    }
    // Resume at first unanswered, or 0
    const st = formState(letter);
    qIndex = 0;
    for (let i = 0; i < questions.length; i++) {
      if (!st.answered[i] || !st.answered[i].correct) {
        qIndex = i;
        break;
      }
      if (i === questions.length - 1) qIndex = i;
    }
    showView('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = questions[qIndex];
    const st = formState(currentForm);
    const ans = st.answered[qIndex] || { wrong: [], correct: false };

    progressPill.textContent = `${qIndex + 1} / ${questions.length}`;
    qCat.textContent = (q.cat || 'question').replace(/_/g, ' ');
    qText.textContent = q.q;
    explainEl.classList.remove('show');
    explainEl.innerHTML = '';
    quizPanel.classList.remove('wrong-pulse');

    optionsEl.innerHTML = '';
    (q.options || []).forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      btn.dataset.idx = String(i);
      btn.innerHTML = `<span class="letter">${LETTERS[i] || i + 1}</span><span>${escapeHtml(opt)}</span>`;

      const isWrongLocked = (ans.wrong || []).includes(i);
      const isCorrectDone = ans.correct && i === q.correct;

      if (isWrongLocked) {
        btn.classList.add('wrong');
        btn.disabled = true;
      }
      if (isCorrectDone) {
        btn.classList.add('correct');
        btn.disabled = true;
      }
      if (ans.correct && i !== q.correct) {
        btn.disabled = true;
      }

      if (!ans.correct) {
        btn.addEventListener('click', () => onChoose(i));
      }

      optionsEl.appendChild(btn);
    });

    if (ans.correct) {
      explainEl.innerHTML = `<strong>Correct.</strong> ${formatExplain(q.explain)}`;
      explainEl.classList.add('show');
      nextBtn.disabled = false;
    } else {
      nextBtn.disabled = true;
    }

    prevBtn.disabled = qIndex === 0;

    // If all correct, next becomes Finish on last
    if (ans.correct && qIndex === questions.length - 1) {
      nextBtn.textContent = 'Finish';
    } else {
      nextBtn.textContent = 'Next';
    }
  }

  function formatExplain(html) {
    // Bank may contain light HTML in explain; sanitize to text-ish by allowing only basic tags via text fallback
    if (!html) return '';
    // Prefer innerHTML for known teaching extracts; strip scripts
    const cleaned = String(html).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    return cleaned;
  }

  function onChoose(idx) {
    const q = questions[qIndex];
    const st = formState(currentForm);
    if (!st.answered[qIndex]) st.answered[qIndex] = { wrong: [], correct: false };
    const ans = st.answered[qIndex];
    if (ans.correct) return;
    if ((ans.wrong || []).includes(idx)) return;

    if (idx === q.correct) {
      ans.correct = true;
      computePct(currentForm);
      saveProgress();
      renderQuestion();
      // If last question just completed all
      const allDone = questions.every((_, i) => st.answered[i] && st.answered[i].correct);
      if (allDone && qIndex === questions.length - 1) {
        // allow Finish via next
      }
    } else {
      ans.wrong.push(idx);
      saveProgress();
      quizPanel.classList.remove('wrong-pulse');
      void quizPanel.offsetWidth;
      quizPanel.classList.add('wrong-pulse');
      const btn = optionsEl.querySelector(`[data-idx="${idx}"]`);
      if (btn) {
        btn.classList.add('soft-wrong');
        setTimeout(() => {
          btn.classList.remove('soft-wrong');
          btn.classList.add('wrong');
          btn.disabled = true;
        }, 380);
      }
    }
  }

  function goNext() {
    const st = formState(currentForm);
    const ans = st.answered[qIndex];
    if (!ans || !ans.correct) return;

    if (qIndex >= questions.length - 1) {
      computePct(currentForm);
      saveProgress();
      const { best, pct } = computePct(currentForm);
      doneTitle.textContent = `Form ${currentForm} complete`;
      doneMsg.textContent = `Score ${pct}% · Best kept ${best}%`;
      showView('done');
      renderHub();
      return;
    }
    qIndex++;
    renderQuestion();
  }

  function goPrev() {
    if (qIndex <= 0) return;
    qIndex--;
    renderQuestion();
  }

  restartBtn.addEventListener('click', () => {
    // Clear current answered for all forms but keep bestPct if 100 (or any best)
    Object.keys(progress).forEach((letter) => {
      const st = formState(letter);
      const best = st.bestPct || 0;
      progress[letter] = { answered: {}, bestPct: best, currentPct: 0 };
    });
    // Also ensure forms exist
    (bank.forms || []).forEach((letter) => {
      if (!progress[letter]) progress[letter] = defaultFormState();
    });
    saveProgress();
    renderHub();
    toast('Progress reset — best scores kept');
  });

  backHubBtn.addEventListener('click', () => {
    renderHub();
    showView('hub');
  });
  doneHubBtn.addEventListener('click', () => {
    renderHub();
    showView('hub');
  });
  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);

  /* —— Pomodoro (optional-lite) —— */
  const FOCUS_SEC = 25 * 60;
  const BREAK_SEC = 5 * 60;
  let pomo = {
    phase: 'focus', // focus | break
    remaining: FOCUS_SEC,
    running: true,
    timer: null,
  };

  function fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updatePomoUI() {
    pomoClock.textContent = fmt(pomo.remaining);
    pomoPhase.textContent = pomo.phase === 'focus' ? 'Focus' : 'Break';
    breakModalClock.textContent = fmt(pomo.remaining);
    pomoToggle.textContent = pomo.running ? '❚❚' : '▶';
  }

  function enterBreak() {
    pomo.phase = 'break';
    pomo.remaining = BREAK_SEC;
    breakModal.classList.add('show');
    updatePomoUI();
  }

  function enterFocus() {
    pomo.phase = 'focus';
    pomo.remaining = FOCUS_SEC;
    breakModal.classList.remove('show');
    updatePomoUI();
  }

  function tick() {
    if (!pomo.running) return;
    pomo.remaining--;
    if (pomo.remaining <= 0) {
      if (pomo.phase === 'focus') enterBreak();
      else enterFocus();
    } else {
      updatePomoUI();
    }
  }

  function startPomo() {
    pomoDock.hidden = false;
    updatePomoUI();
    if (pomo.timer) clearInterval(pomo.timer);
    pomo.timer = setInterval(tick, 1000);
  }

  pomoToggle.addEventListener('click', () => {
    pomo.running = !pomo.running;
    updatePomoUI();
  });

  pomoSkip.addEventListener('click', () => {
    if (pomo.phase === 'focus') enterBreak();
    else enterFocus();
  });

  // Close dismisses overlay ONLY — break timer continues
  breakCloseBtn.addEventListener('click', () => {
    breakModal.classList.remove('show');
  });

  breakModal.addEventListener('click', (e) => {
    if (e.target === breakModal) breakModal.classList.remove('show');
  });

  /* —— Boot —— */
  if (!bankPath) {
    loadStatus.className = 'status-msg error';
    loadStatus.textContent = 'Missing ?bank= path. Open a material from the portal.';
    return;
  }

  fetch(bankPath)
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((data) => {
      bank = data;
      storageKey = 'examPortal:' + (bank.id || bankPath);
      loadProgress();
      (bank.forms || Object.keys(bank.bank || {})).forEach((f) => formState(f));

      examTitle.textContent = bank.title || 'Exam';
      examSub.textContent = `${bank.subject || ''} · ${bank.formSize || 20} questions per form`;
      examBadge.textContent = `Forms ${(bank.forms || []).join('·') || 'A–H'}`;
      document.title = `${bank.title || 'Exam'} · Portal`;

      loadStatus.style.display = 'none';
      renderHub();
      showView('hub');
      startPomo();
    })
    .catch((err) => {
      loadStatus.className = 'status-msg error';
      loadStatus.textContent =
        'Could not fetch bank "' + bankPath + '". Use HTTP (python -m http.server), not file://. ' + err.message;
    });
})();
