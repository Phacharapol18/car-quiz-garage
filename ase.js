/* ASE Prep Garage: study modes, weighted exam simulation, progress tracking */
(() => {
  'use strict';

  const PASS = 70; // study benchmark (%), not the official ASE cut score
  const PRACTICE_LEN = 10;
  const MOCK_LEN = 40;
  const KEY = 'asecert.v1';
  const TEST_CODES = Object.keys(ASE_TESTS);
  const MASTER_CODES = TEST_CODES.filter((c) => ASE_TESTS[c].master);
  const LETTERS = 'ABCD';

  // ---------- storage ----------
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (isObj(v)) return v;
    } catch { /* corrupt or unavailable */ }
    return {};
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* unavailable */ } };
  const data = load();
  if (!isObj(data.q)) data.q = {};
  if (!isObj(data.best)) data.best = {};
  if (!Number.isFinite(data.mockBest)) data.mockBest = null;
  if (!Object.hasOwn(ASE_TESTS, data.sel)) data.sel = 'A1';

  const statOf = (id) => (isObj(data.q[id]) ? data.q[id] : null);
  const bestOf = (t) => (Number.isFinite(data.best[t]) ? data.best[t] : null);
  const earned = (t) => (bestOf(t) ?? -1) >= PASS;
  function record(id, ok) {
    const s = statOf(id) || { n: 0, c: 0 };
    s.n = (Number(s.n) || 0) + 1;
    s.c = (Number(s.c) || 0) + (ok ? 1 : 0);
    s.last = ok;
    data.q[id] = s;
  }
  const inTest = (t, sub) => ASE_QUESTIONS.filter((q) => q.test === t && (!sub || q.sub === sub));
  // ---------- Free vs Pro ----------
  const Pro = window.CarQuizPro || { edition: 'web', isPro: () => true, price: () => null, onChange() {}, buy: async () => 'store', restore: async () => false };
  const hasPro = () => Pro.isPro();
  if (typeof markFreeQuestions === 'function') markFreeQuestions(ASE_QUESTIONS);
  // Questions this player can use: everything with Pro, otherwise the free sample.
  const open = (t, sub) => inTest(t, sub).filter((q) => q.free || hasPro());
  const weakIn = (t) => open(t).filter((q) => statOf(q.id)?.last === false);
  const masteredIn = (t, sub) => inTest(t, sub).filter((q) => statOf(q.id)?.last === true).length;
  const areaOf = (q) => ASE_TESTS[q.test].areas.find((a) => a.key === q.sub);
  const examLen = (t) => Math.min(ASE_TESTS[t].scored, inTest(t).length);
  const examSeconds = (t, n) => Math.round((ASE_TESTS[t].minutes * 60 * n) / ASE_TESTS[t].scored);

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function make(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Emphasise the words that flip a question's meaning, as printed tests do.
  function emphasise(node, text) {
    node.textContent = '';
    text.split(/\b(EXCEPT|NOT|BELOW|ABOVE|ALL|ONLY|LEFT|RIGHT|LEAST|MOST)\b/).forEach((part, i) => {
      node.append(i % 2 ? make('mark', null, part) : document.createTextNode(part));
    });
  }

  // Split `total` across weights using largest remainders, capped by availability.
  function allocate(total, weights, caps) {
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map((w) => (w * total) / sum);
    const out = raw.map((r, i) => Math.min(Math.floor(r), caps[i]));
    const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    let left = total - out.reduce((a, b) => a + b, 0);
    // by remainder first, then wherever spare questions remain
    while (left > 0) {
      let moved = false;
      for (const i of order) {
        if (left <= 0) break;
        if (out[i] < caps[i]) { out[i] += 1; left -= 1; moved = true; }
      }
      if (!moved) break;
    }
    return out;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function confetti() {
    if (reducedMotion) return;
    const box = $('#confetti');
    const colors = ['#d65a42', '#f2b33d', '#2bb3a3', '#f3e6c8', '#1b1d21'];
    for (let i = 0; i < 80; i++) {
      const c = document.createElement('i');
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
      c.style.animationDelay = `${Math.random() * 0.5}s`;
      box.append(c);
    }
    setTimeout(() => { box.innerHTML = ''; }, 4200);
  }

  const dlg = $('#dlg');
  function confirmDialog({ title, body, ok, cancel = 'Cancel' }) {
    $('#dlg-title').textContent = title;
    $('#dlg-body').textContent = body;
    $('#dlg-ok').textContent = ok;
    $('#dlg-cancel').textContent = cancel;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((resolve) => {
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    });
  }

  // ---------- screens ----------
  const screens = { home: $('#screen-home'), quiz: $('#screen-quiz'), results: $('#screen-results') };
  let current = 'home';
  function show(name) {
    Object.entries(screens).forEach(([k, n]) => { n.hidden = k !== name; });
    current = name;
    window.scrollTo({ top: 0 });
  }

  // ---------- home ----------
  function renderHome() {
    const count = MASTER_CODES.filter(earned).length;
    const extra = TEST_CODES.filter((c) => !ASE_TESTS[c].master && earned(c));
    $('#patch-count').textContent = count;
    $('#path-fill').style.width = `${(count / MASTER_CODES.length) * 100}%`;
    $('#rank').textContent = (count === 0
      ? 'Apprentice. Pass any A1–A8 exam to earn your first Master patch.'
      : count < MASTER_CODES.length
        ? `Certified in ${count} of the Master tests. ${MASTER_CODES.length - count} more for Master Technician.`
        : '🏆 Master Technician. A1–A8 all earned.') + (extra.length ? ` Also earned: ${extra.join(', ')}.` : '');

    const grid = $('#areas');
    grid.innerHTML = '';
    TEST_CODES.forEach((code) => {
      const t = ASE_TESTS[code];
      const total = inTest(code).length;
      const mastered = masteredIn(code);
      const best = bestOf(code);
      const b = make('button', `area${t.master ? '' : ' area--extra'}`);
      b.type = 'button';
      b.setAttribute('role', 'listitem');
      b.setAttribute('aria-pressed', String(code === data.sel));
      b.dataset.area = code;
      const top = make('span', 'area__top');
      top.append(make('span', `patch${earned(code) ? ' is-earned' : ''}`, code), make('span', null, t.icon));
      const meter = make('span', 'meter');
      const fill = make('i');
      fill.style.width = `${total ? (mastered / total) * 100 : 0}%`;
      meter.append(fill);
      const bestText = best == null ? 'no exam yet' : `best exam ${best}%`;
      b.append(top, make('span', 'area__name', t.name.replace(/\//g, '/\u200b')), make('span', 'area__best', `${mastered}/${total} mastered · ${bestText}`), meter);
      b.setAttribute('aria-label', `${code} ${t.name}. ${earned(code) ? 'Patch earned.' : 'No patch yet.'} ${mastered} of ${total} mastered. ${bestText}.`);
      b.addEventListener('click', () => {
        data.sel = code;
        save();
        renderHome();
        $('#modes').scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
      });
      grid.append(b);
    });

    const code = data.sel;
    const t = ASE_TESTS[code];
    const n = examLen(code);
    const weak = weakIn(code).length;
    $('#sel-code').textContent = code;
    $('#sel-name').textContent = t.name;
    const pro = hasPro();
    const avail = open(code).length;
    $('#desc-practice').textContent = pro
      ? `${Math.min(PRACTICE_LEN, avail)} mixed questions, explained as you go, no clock.`
      : `${Math.min(PRACTICE_LEN, avail)} questions from the free sample (${avail} of ${inTest(code).length}), explained as you go.`;
    $('#desc-exam').textContent = `Full length: ${n} questions in ${mmss(examSeconds(code, n))}, weighted like the real test. Score ${PASS}% for the ${code} patch.`;
    for (const id of ['#mode-exam', '#mode-mock']) {
      $(id).classList.toggle('is-locked', !pro);
      if (pro) $(id).removeAttribute('aria-description'); else $(id).setAttribute('aria-description', 'Pro feature');
    }
    renderProStatus();
    $('#desc-weak').textContent = weak ? `Retry the ${weak} question${weak > 1 ? 's' : ''} you got wrong last time.` : 'Nothing to retry yet. Missed questions land here.';
    $('#mode-weak').disabled = !weak;

    const list = $('#subs');
    list.innerHTML = '';
    t.areas.forEach((a) => {
      const bank = inTest(code, a.key).length;
      const usable = open(code, a.key).length;
      const got = masteredIn(code, a.key);
      const li = make('li', 'sub');
      const label = make('span', 'sub__label');
      label.append(make('b', null, a.key), document.createTextNode(` ${a.name}`));
      const meta = make('span', 'sub__meta', pro ? `${a.n} on test · ${got}/${bank} mastered` : `${a.n} on test · ${usable} of ${bank} free`);
      const meter = make('span', 'meter');
      const fill = make('i');
      fill.style.width = `${bank ? (got / bank) * 100 : 0}%`;
      meter.append(fill);
      const btn = make('button', 'btn btn--ghost sub__go', 'Drill');
      btn.type = 'button';
      btn.disabled = !usable;
      btn.setAttribute('aria-label', `Drill ${code} content area ${a.key}: ${a.name}`);
      btn.addEventListener('click', () => start('drill', code, { sub: a.key }));
      li.append(label, meta, meter, btn);
      list.append(li);
    });

    $('#desc-mock').textContent = `${MOCK_LEN} questions across A1–A8, weighted by each test's size, in ${mmss(MOCK_LEN * 90)}.${data.mockBest == null ? '' : ` Best: ${data.mockBest}%.`}`;
  }

  function renderProStatus() {
    const chip = $('#pro-status');
    chip.classList.toggle('is-pro', hasPro());
    chip.textContent = hasPro() ? '★ Pro' : Pro.edition === 'play' ? 'Free · Unlock Pro' : 'Free demo · Get the app';
    chip.disabled = hasPro();
    chip.setAttribute('aria-label', hasPro() ? 'Pro unlocked' : 'See what Pro unlocks');
  }

  // ---------- Pro sheet (paywall) ----------
  const paywall = $('#paywall');
  const PAYWALL_TITLE = {
    exam: 'Full exams are part of Pro',
    mock: 'The Master mock is part of Pro',
    more: 'Unlock every question',
  };
  function openPaywall(reason = 'more') {
    if (paywall.open || hasPro()) return;
    $('#pw-title').textContent = PAYWALL_TITLE[reason] || PAYWALL_TITLE.more;
    const store = Pro.edition !== 'play';
    const price = Pro.price();
    $('#pw-buy').textContent = store ? 'Get the app on Google Play' : price ? `Unlock Pro for ${price}` : 'Unlock Pro';
    $('#pw-buy').disabled = false;
    $('#pw-restore').hidden = store;
    $('#pw-note').textContent = store
      ? 'This web demo has the free sample. The Android app unlocks everything with a one-time purchase.'
      : 'One-time purchase through Google Play. No subscription, and it keeps working offline.';
    $('#pw-msg').textContent = '';
    paywall.showModal();
    $('#pw-buy').focus();
  }
  $('#pw-close').addEventListener('click', () => paywall.close());
  $('#pw-buy').addEventListener('click', async () => {
    const btn = $('#pw-buy');
    const label = btn.textContent;
    btn.disabled = true;
    if (Pro.edition === 'play') btn.textContent = 'Opening Google Play…';
    const result = await Pro.buy();
    btn.textContent = label;
    btn.disabled = false;
    const msg = $('#pw-msg');
    if (result === 'purchased') {
      paywall.close();
      renderHome();
      toast('Pro unlocked. Every question is yours.');
      confetti();
    } else if (result === 'pending') {
      msg.textContent = 'Payment pending. Pro unlocks automatically when Google Play confirms it.';
    } else if (result === 'error') {
      msg.textContent = "Couldn't complete the purchase. Check your connection and try again.";
    }
  });
  $('#pw-restore').addEventListener('click', async () => {
    const ok = await Pro.restore();
    if (ok && hasPro()) { paywall.close(); renderHome(); toast('Purchase restored. Pro is unlocked.'); }
    else $('#pw-msg').textContent = ok ? 'No Pro purchase found on this Google account.' : "Couldn't reach Google Play. Try again when you're online.";
  });
  $('#pro-status').addEventListener('click', () => openPaywall('more'));
  Pro.onChange(() => { if (current === 'home') renderHome(); else renderProStatus(); });

  $('#mode-practice').addEventListener('click', () => start('practice', data.sel));
  $('#mode-exam').addEventListener('click', () => start('exam', data.sel));
  $('#mode-weak').addEventListener('click', () => start('weak', data.sel));
  $('#mode-mock').addEventListener('click', () => start('mock', null));
  $('#reset').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Reset all progress?', body: 'This clears your patches, exam scores, and question history on this device.', ok: 'Reset' });
    if (!ok) return;
    data.q = {}; data.best = {}; data.mockBest = null;
    save();
    renderHome();
    toast('Progress reset');
  });

  // ---------- sessions ----------
  let sess = null;
  const MODE_LABEL = { practice: 'Practice', drill: 'Topic drill', exam: 'Full exam', weak: 'Weak spots', mock: 'Master mock', missed: 'Missed review' };
  const isExamKind = (k) => k === 'exam' || k === 'mock';

  function toItem(q) {
    if (q.type === 'tech') return { q, choices: TECH_CHOICES.slice(), answer: q.answer, picked: null, flagged: false };
    const order = shuffle([0, 1, 2, 3]);
    return { q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer), picked: null, flagged: false };
  }

  // Questions not yet answered correctly come first, so practice keeps covering new ground.
  function freshFirst(pool, n) {
    const notYet = shuffle(pool.filter((q) => statOf(q.id)?.last !== true));
    const done = shuffle(pool.filter((q) => statOf(q.id)?.last === true));
    return notYet.concat(done).slice(0, n);
  }

  // Draw an exam that mirrors the official content-area weighting.
  function weightedExam(code, n) {
    const areas = ASE_TESTS[code].areas;
    const banks = areas.map((a) => shuffle(inTest(code, a.key)));
    const counts = allocate(n, areas.map((a) => a.n), banks.map((b) => b.length));
    return shuffle(banks.flatMap((b, i) => b.slice(0, counts[i])));
  }

  function pick(kind, code, opts) {
    if (opts.questions) return shuffle(opts.questions);
    if (kind === 'exam') return weightedExam(code, examLen(code));
    if (kind === 'weak') return shuffle(weakIn(code));
    if (kind === 'drill') return freshFirst(open(code, opts.sub), PRACTICE_LEN);
    if (kind === 'mock') {
      const counts = allocate(MOCK_LEN, MASTER_CODES.map((c) => ASE_TESTS[c].scored), MASTER_CODES.map((c) => inTest(c).length));
      return shuffle(MASTER_CODES.flatMap((c, i) => weightedExam(c, counts[i])));
    }
    return freshFirst(open(code), PRACTICE_LEN);
  }

  function start(kind, code, opts = {}) {
    if (isExamKind(kind) && !hasPro()) { openPaywall(kind); return; }
    const qs = pick(kind, code, opts);
    if (!qs.length) { toast('No questions to show'); return; }
    sess = {
      kind, code, sub: opts.sub || null, exam: isExamKind(kind),
      items: qs.map(toItem),
      i: 0,
      remaining: kind === 'exam' ? examSeconds(code, qs.length) : kind === 'mock' ? qs.length * 90 : null,
    };
    $('#q-mode').textContent = MODE_LABEL[kind] + (sess.sub ? ` · ${sess.sub}` : '');
    $('#q-clock').hidden = !sess.exam;
    $('#q-examnav').hidden = !sess.exam;
    $('#q-grid-wrap').hidden = !sess.exam;
    show('quiz');
    if (sess.exam) { buildGrid(); startClock(); }
    renderItem();
  }

  // ---------- question rendering ----------
  function renderItem() {
    const it = sess.items[sess.i];
    const q = it.q;
    const total = sess.items.length;
    const area = areaOf(q);
    $('#q-count').textContent = `${sess.i + 1} of ${total}`;
    $('#q-progress').style.width = `${((sess.exam ? answeredCount() : sess.i) / total) * 100}%`;
    $('#q-area').textContent = `${q.test} · ${ASE_TESTS[q.test].name}`;
    $('#q-sub').textContent = area ? `${area.key}. ${area.name}` : '';

    emphasise($('#q-stem'), q.q);
    const isTech = q.type === 'tech';
    $('#q-techs').hidden = !isTech;
    if (isTech) { $('#q-ta').textContent = q.ta; $('#q-tb').textContent = q.tb; }

    const box = $('#q-choices');
    box.innerHTML = '';
    it.choices.forEach((text, idx) => {
      const b = make('button', 'choice');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(it.picked === idx));
      b.append(make('span', 'choice__key', LETTERS[idx]), make('span', null, text));
      b.addEventListener('click', () => choose(idx));
      box.append(b);
    });

    $('#q-explain').hidden = true;
    if (sess.exam) {
      $('#q-flag').setAttribute('aria-pressed', String(it.flagged));
      $('#q-prev').disabled = sess.i === 0;
      $('#q-fwd').disabled = sess.i === total - 1;
      updateGrid();
    }
    window.scrollTo({ top: 0 });
    (box.querySelector('[aria-checked="true"]') || box.firstElementChild).focus({ preventScroll: true });
  }

  function choose(idx) {
    const it = sess.items[sess.i];
    if (sess.exam) {
      it.picked = idx;
      [...$('#q-choices').children].forEach((b, i) => b.setAttribute('aria-checked', String(i === idx)));
      $('#q-progress').style.width = `${(answeredCount() / sess.items.length) * 100}%`;
      updateGrid();
      return;
    }
    if (it.picked !== null) return; // already answered in practice
    it.picked = idx;
    const ok = idx === it.answer;
    record(it.q.id, ok);
    save();
    if (!ok && window.CarQuizApp) window.CarQuizApp.buzz(60);
    [...$('#q-choices').children].forEach((b, i) => {
      b.disabled = true;
      b.setAttribute('aria-checked', String(i === idx));
      if (i === it.answer) b.classList.add('is-correct');
      else if (i === idx) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
    const v = $('#q-verdict');
    v.textContent = ok ? 'Correct' : 'Not quite';
    v.className = `explain__verdict ${ok ? 'good' : 'bad'}`;
    const why = $('#q-why');
    why.textContent = '';
    if (!ok) why.append(make('b', 'explain__answer', `Answer: ${LETTERS[it.answer]}. ${it.choices[it.answer]}. `));
    why.append(document.createTextNode(it.q.why));
    $('#q-next').querySelector('span').textContent = sess.i + 1 >= sess.items.length ? 'See results' : 'Next question';
    $('#q-explain').hidden = false;
    $('#q-progress').style.width = `${((sess.i + 1) / sess.items.length) * 100}%`;
    $('#q-next').focus({ preventScroll: true });
    $('#q-explain').scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function nextPractice() {
    if (!sess || sess.exam || sess.items[sess.i].picked === null) return;
    if (sess.i + 1 >= sess.items.length) finish();
    else { sess.i += 1; renderItem(); }
  }
  $('#q-next').addEventListener('click', nextPractice);

  // ---------- exam navigation ----------
  const answeredCount = () => sess.items.filter((it) => it.picked !== null).length;

  function buildGrid() {
    const g = $('#q-grid');
    g.innerHTML = '';
    sess.items.forEach((_, i) => {
      const c = make('button', 'cell', String(i + 1));
      c.type = 'button';
      c.addEventListener('click', () => goTo(i));
      g.append(c);
    });
  }
  function updateGrid() {
    [...$('#q-grid').children].forEach((c, i) => {
      const it = sess.items[i];
      c.classList.toggle('is-done', it.picked !== null);
      c.classList.toggle('is-flag', it.flagged);
      c.classList.toggle('is-current', i === sess.i);
      c.setAttribute('aria-label', `Question ${i + 1}${it.picked !== null ? ', answered' : ', not answered'}${it.flagged ? ', flagged' : ''}`);
      if (i === sess.i) c.setAttribute('aria-current', 'step'); else c.removeAttribute('aria-current');
    });
  }
  function goTo(i) {
    if (!sess || !sess.exam || i < 0 || i >= sess.items.length) return;
    sess.i = i;
    renderItem();
  }
  function toggleFlag() {
    if (!sess || !sess.exam) return;
    const it = sess.items[sess.i];
    it.flagged = !it.flagged;
    $('#q-flag').setAttribute('aria-pressed', String(it.flagged));
    updateGrid();
  }
  $('#q-prev').addEventListener('click', () => goTo(sess.i - 1));
  $('#q-fwd').addEventListener('click', () => goTo(sess.i + 1));
  $('#q-flag').addEventListener('click', toggleFlag);
  $('#q-submit').addEventListener('click', trySubmit);

  async function trySubmit() {
    if (!sess || !sess.exam) return;
    const open = sess.items.length - answeredCount();
    const flagged = sess.items.filter((it) => it.flagged).length;
    if (open || flagged) {
      pauseClock();
      const parts = [];
      if (open) parts.push(`${open} unanswered (scored as wrong)`);
      if (flagged) parts.push(`${flagged} flagged`);
      const ok = await confirmDialog({ title: 'Submit exam?', body: `You have ${parts.join(' and ')}.`, ok: 'Submit', cancel: 'Keep working' });
      if (!ok) { startClock(); return; }
    }
    finish();
  }

  // ---------- exam clock ----------
  let clockTimer = 0;
  let clockEnd = 0;
  function startClock() {
    clearInterval(clockTimer);
    clockEnd = performance.now() + sess.remaining * 1000;
    tickClock();
    clockTimer = setInterval(tickClock, 250);
  }
  function pauseClock() {
    if (!clockTimer) return;
    clearInterval(clockTimer);
    clockTimer = 0;
    sess.remaining = Math.max(0, (clockEnd - performance.now()) / 1000);
  }
  function tickClock() {
    const left = Math.max(0, (clockEnd - performance.now()) / 1000);
    sess.remaining = left;
    const el = $('#q-clock');
    el.textContent = mmss(Math.ceil(left));
    el.classList.toggle('low', left <= 60);
    el.setAttribute('aria-label', `${Math.ceil(left / 60)} minutes left`);
    if (left <= 0) {
      pauseClock();
      if (dlg.open) dlg.close('cancel');
      toast("Time's up. Exam submitted.");
      finish();
    }
  }

  // ---------- quit ----------
  async function quit() {
    if (!sess || dlg.open) return;
    if (sess.exam) pauseClock();
    const ok = await confirmDialog({
      title: 'Leave this session?',
      body: sess.exam ? 'Your exam answers will not be scored or saved.' : 'Answers so far are saved to your history.',
      ok: 'Leave', cancel: 'Stay',
    });
    if (!ok) { if (sess.exam) startClock(); return; }
    pauseClock();
    sess = null;
    renderHome();
    show('home');
  }
  $('#q-quit').addEventListener('click', quit);

  // ---------- results ----------
  function finish() {
    pauseClock();
    const s = sess;
    if (s.done) return;
    s.done = true;
    if (s.exam) s.items.forEach((it) => record(it.q.id, it.picked === it.answer));

    const total = s.items.length;
    const correct = s.items.filter((it) => it.picked === it.answer).length;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= PASS;
    s.missed = s.items.filter((it) => it.picked !== it.answer).map((it) => it.q);

    const patch = $('#r-patch');
    patch.hidden = true;
    patch.className = 'patch patch--big';
    $('#r-breakdown').hidden = true;
    $('#r-score').textContent = `${pct}%`;
    $('#r-raw').textContent = `${correct} of ${total} correct`;
    const title = $('#r-title');
    title.className = 'report__title';
    const t = s.code ? ASE_TESTS[s.code] : null;

    if (s.kind === 'exam') {
      const prev = bestOf(s.code);
      const firstPatch = passed && (prev ?? -1) < PASS;
      data.best[s.code] = Math.max(prev ?? 0, pct);
      $('#r-eyebrow').textContent = `${s.code} · ${t.name} · full exam`;
      $('#r-patch-code').textContent = s.code;
      patch.hidden = !passed;
      if (passed) patch.classList.add('is-earned');
      title.textContent = firstPatch ? `${s.code} patch earned!` : passed ? 'Passed' : 'Not yet';
      title.classList.add(passed ? 'pass' : 'fail');
      const count = MASTER_CODES.filter(earned).length;
      $('#r-sub').textContent = passed
        ? (t.master && count === MASTER_CODES.length ? '🏆 That completes A1–A8. You reached Master Technician!' : `You beat the ${PASS}% target. The content-area report shows anything still worth reviewing.`)
        : `You need ${PASS}% for the patch. Areas in red are where to focus. Drill them from the garage.`;
      renderBreakdown(s, 'sub');
      if (firstPatch) confetti();
    } else if (s.kind === 'mock') {
      data.mockBest = Math.max(data.mockBest ?? 0, pct);
      $('#r-eyebrow').textContent = 'Master mock exam · A1–A8';
      title.textContent = passed ? 'Shop-ready' : 'Keep wrenching';
      title.classList.add(passed ? 'pass' : 'fail');
      $('#r-sub').textContent = passed ? `Above the ${PASS}% target across A1–A8. Check below for any test that is still weak.` : `The target is ${PASS}%. Tests in red below are where to focus next.`;
      renderBreakdown(s, 'test');
      if (passed) confetti();
    } else {
      const sub = s.sub ? t.areas.find((a) => a.key === s.sub) : null;
      $('#r-eyebrow').textContent = `${MODE_LABEL[s.kind]}${s.code ? ` · ${s.code} ${t.name}` : ''}${sub ? ` · ${sub.key}. ${sub.name}` : ''}`;
      title.textContent = correct === total ? 'Clean sweep!' : 'Session complete';
      $('#r-sub').textContent = (s.missed.length
        ? `Missed questions are saved to Weak spots. When you're scoring well, take the ${s.code ? s.code + ' ' : ''}full exam.`
        : 'Every answer was right. You could be ready for the full exam.')
        + (hasPro() ? '' : ' Full exams, patches, and the other questions come with Pro.');
    }
    save();

    $('#r-missed').hidden = !s.missed.length;
    renderReview(s);
    show('results');
    (s.missed.length ? $('#r-missed') : $('#r-retake')).focus({ preventScroll: true });
  }

  // Score report rows, like the content-area breakdown on an ASE score report.
  function renderBreakdown(s, by) {
    const box = $('#r-breakdown');
    box.innerHTML = '';
    const groups = by === 'test'
      ? MASTER_CODES.map((c) => ({ key: c, label: ASE_TESTS[c].name, match: (q) => q.test === c }))
      : ASE_TESTS[s.code].areas.map((a) => ({ key: a.key, label: a.name, match: (q) => q.sub === a.key }));
    groups.forEach((g) => {
      const items = s.items.filter((it) => g.match(it.q));
      if (!items.length) return;
      const ok = items.filter((it) => it.picked === it.answer).length;
      const p = Math.round((ok / items.length) * 100);
      const row = make('div', 'bd');
      const name = make('span', 'bd__name');
      name.append(make('b', null, g.key), document.createTextNode(` ${g.label}`));
      const bar = make('div', 'bd__bar');
      const fill = make('i', p < PASS ? 'low' : '');
      fill.style.width = `${p}%`;
      bar.append(fill);
      row.append(name, bar, make('span', 'bd__n', `${ok}/${items.length}`));
      box.append(row);
    });
    box.hidden = false;
  }

  function renderReview(s) {
    const list = $('#r-list');
    list.innerHTML = '';
    s.items.forEach((it) => {
      const ok = it.picked === it.answer;
      const li = make('li', ok ? 'ok' : 'bad');
      const area = areaOf(it.q);
      li.append(make('span', 'rv__meta', `${it.q.test}${area ? ` · ${area.key}. ${area.name}` : ''}${it.flagged ? ' · flagged' : ''}`));
      li.append(make('span', 'rv__q', it.q.q));
      if (it.q.type === 'tech') {
        const t = make('div', 'rv__techs');
        t.append(make('span', null, `A: ${it.q.ta}`), make('span', null, `B: ${it.q.tb}`));
        li.append(t);
      }
      const ans = make('p', 'rv__ans');
      if (!ok) {
        ans.append(make('span', 'yours', it.picked === null ? 'No answer' : `You: ${LETTERS[it.picked]}. ${it.choices[it.picked]}`), document.createTextNode(' · '));
      }
      ans.append(make('span', 'right', `Correct: ${LETTERS[it.answer]}. ${it.choices[it.answer]}`));
      li.append(ans, make('p', 'rv__why', it.q.why));
      list.append(li);
    });
    const toggle = $('#r-only-missed');
    toggle.checked = s.missed.length > 0;
    toggle.disabled = s.missed.length === 0;
    list.classList.toggle('only-missed', toggle.checked);
  }
  $('#r-only-missed').addEventListener('change', (e) => $('#r-list').classList.toggle('only-missed', e.target.checked));

  $('#r-missed').addEventListener('click', () => sess && start('missed', sess.code, { questions: sess.missed }));
  $('#r-retake').addEventListener('click', () => {
    if (!sess) return;
    if (sess.kind === 'missed') start('missed', sess.code, { questions: sess.items.map((it) => it.q) });
    else start(sess.kind, sess.code, { sub: sess.sub });
  });
  $('#r-home').addEventListener('click', () => { sess = null; renderHome(); show('home'); });

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || dlg.open || paywall.open) return;
    if (e.target.matches('input, textarea')) return;
    if (current !== 'quiz' || !sess) return;
    const key = e.key.toLowerCase();
    if (key === 'escape') { e.preventDefault(); quit(); return; }
    let n = 'abcd'.indexOf(key);
    if (n < 0) n = '1234'.indexOf(key);
    if (n >= 0 && n < sess.items[sess.i].choices.length) {
      const b = $('#q-choices').children[n];
      if (b && !b.disabled) { e.preventDefault(); choose(n); }
      return;
    }
    if (sess.exam) {
      if (key === 'arrowright') { e.preventDefault(); goTo(sess.i + 1); }
      else if (key === 'arrowleft') { e.preventDefault(); goTo(sess.i - 1); }
      else if (key === 'f') toggleFlag();
    } else if ((key === 'enter' || key === ' ') && sess.items[sess.i].picked !== null) {
      e.preventDefault();
      nextPractice();
    }
  });

  // ---------- Android back button ----------
  if (window.CarQuizApp) {
    window.CarQuizApp.onBack(() => {
      if (paywall.open) { paywall.close(); return true; }
      if (dlg.open) { dlg.close('cancel'); return true; }
      if (current === 'quiz' && sess) { quit(); return true; }
      if (current === 'results') { sess = null; renderHome(); show('home'); return true; }
      return false;
    });
  }

  renderHome();
})();
