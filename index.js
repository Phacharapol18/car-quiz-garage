/* Car Quiz Grand Prix: game logic */
(() => {
  'use strict';

  // ---------- config ----------
  const RACE_LEN = 10;
  const FUEL_SECONDS = 7;
  const DIFFS = {
    rookie: { label: 'Rookie', time: 20, goal: 1000 },
    pro: { label: 'Pro', time: 15, goal: 1500 },
    legend: { label: 'Legend', time: 10, goal: 2000 },
  };
  const KEYS = {
    lb: 'carquiz.leaderboard.v1',
    prefs: 'carquiz.prefs.v1',
    seen: 'carquiz.seen.v1',
  };
  const LB_SIZE = 10;

  // ---------- storage (can fail in private mode, so every call is guarded) ----------
  // `fallback` doubles as the expected shape: a stored value of the wrong type is ignored.
  const store = {
    get(key, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        const sameShape = Array.isArray(fallback) ? Array.isArray(value) : value !== null && typeof value === typeof fallback && !Array.isArray(value);
        return sameShape ? value : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  const prefs = Object.assign({ cat: 'all', diff: 'pro', muted: false, name: '' }, store.get(KEYS.prefs, {}));
  if (typeof prefs.name !== 'string') prefs.name = '';
  prefs.muted = prefs.muted === true;
  if (!Object.hasOwn(CATEGORIES, prefs.cat)) prefs.cat = 'all';
  if (!Object.hasOwn(DIFFS, prefs.diff)) prefs.diff = 'pro';
  const savePrefs = () => store.set(KEYS.prefs, prefs);

  // ---------- dom ----------
  const $ = (sel) => document.querySelector(sel);
  const el = {
    screens: { title: $('#screen-title'), game: $('#screen-game'), results: $('#screen-results') },
    setup: $('#setup'), catOptions: $('#cat-options'), diffOptions: $('#diff-options'), diffHint: $('#diff-hint'),
    lbTitle: $('#lb-title-list'), lbClear: $('#lb-clear'),
    lap: $('#hud-lap'), score: $('#hud-score'), streak: $('#hud-streak'), streakWrap: $('#hud-streak-wrap'),
    mute: $('#mute'), quit: $('#quit'),
    carYou: $('#car-you'), carPace: $('#car-pace'), gap: $('#track-gap'),
    cat: $('#q-cat'), timer: $('#timer'), timerNum: $('#timer-num'), timebar: $('#timebar'),
    question: $('#q-text'), answers: $('#answers'),
    ll5050: $('#ll-5050'), llTime: $('#ll-time'), lifelines: $('#lifelines'),
    feedback: $('#feedback'), fbVerdict: $('#fb-verdict'), fbPoints: $('#fb-points'), fbFact: $('#fb-fact'), next: $('#next'),
    resEyebrow: $('#res-eyebrow'), resTitle: $('#res-title'), resSub: $('#res-sub'),
    resScore: $('#res-score'), resAcc: $('#res-acc'), resStreak: $('#res-streak'), resSpeed: $('#res-speed'),
    saveForm: $('#save-form'), name: $('#player-name'), saveDone: $('#save-done'), lbResults: $('#lb-results-list'),
    again: $('#again'), menu: $('#menu'), share: $('#share'), review: $('#review-list'),
    quitDialog: $('#quit-dialog'), toast: $('#toast'), confetti: $('#confetti'),
  };

  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- sound (Web Audio, nothing to download) ----------
  const sfx = (() => {
    let ctx;
    const ensure = () => {
      if (prefs.muted) return null;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      } catch { return null; }
    };
    const tone = (freq, dur, { type = 'sine', at = 0, gain = 0.15, to } = {}) => {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime + at;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };
    return {
      unlock: ensure,
      start() { tone(55, 0.9, { type: 'sawtooth', to: 220, gain: 0.08 }); tone(880, 0.15, { at: 0.95, type: 'square', gain: 0.06 }); },
      correct() { [660, 880, 1320].forEach((f, i) => tone(f, 0.18, { at: i * 0.07, type: 'triangle' })); },
      nitro() { tone(200, 0.5, { type: 'sawtooth', to: 900, gain: 0.06 }); },
      wrong() { tone(180, 0.35, { type: 'sawtooth', to: 90, gain: 0.1 }); },
      tick() { tone(1200, 0.05, { type: 'square', gain: 0.04 }); },
      click() { tone(500, 0.04, { type: 'square', gain: 0.03 }); },
      win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, { at: i * 0.12, type: 'triangle' })); },
      lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, { at: i * 0.18, type: 'triangle' })); },
    };
  })();
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ } };

  // ---------- screens ----------
  let current = 'title';
  function show(name) {
    Object.entries(el.screens).forEach(([key, node]) => { node.hidden = key !== name; });
    current = name;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  // ---------- setup screen ----------
  function poolFor(cat) {
    return cat === 'all' ? QUESTIONS : QUESTIONS.filter((q) => q.cat === cat);
  }

  function buildSetup() {
    el.catOptions.innerHTML = '';
    Object.entries(CATEGORIES).forEach(([key, c]) => {
      const label = document.createElement('label');
      const count = poolFor(key).length;
      label.innerHTML = `<input type="radio" name="cat" value="${key}"><span>${c.icon} ${c.label} <small>(${count})</small></span>`;
      label.querySelector('input').checked = key === prefs.cat;
      el.catOptions.append(label);
    });
    el.diffOptions.innerHTML = '';
    Object.entries(DIFFS).forEach(([key, d]) => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="radio" name="diff" value="${key}"><span>${d.label}<small>${d.time}s per question</small></span>`;
      label.querySelector('input').checked = key === prefs.diff;
      el.diffOptions.append(label);
    });
    updateHint();
  }

  function updateHint() {
    const d = DIFFS[prefs.diff];
    const n = Math.min(RACE_LEN, poolFor(prefs.cat).length);
    el.diffHint.textContent = `${n} questions, ${d.time}s each. To beat the pace car you need ${fmt(goalFor(d, n))} pts.`;
  }

  el.setup.addEventListener('change', (e) => {
    if (e.target.name === 'cat') prefs.cat = e.target.value;
    if (e.target.name === 'diff') prefs.diff = e.target.value;
    savePrefs();
    updateHint();
    sfx.click();
  });
  el.setup.addEventListener('submit', (e) => { e.preventDefault(); startRace(); });

  // ---------- leaderboard ----------
  function loadBoard() {
    const raw = store.get(KEYS.lb, []);
    return raw.filter((r) => r && typeof r.name === 'string' && Number.isFinite(r.score)).slice(0, LB_SIZE);
  }

  function renderBoard(list, highlightId) {
    const board = loadBoard();
    list.innerHTML = '';
    if (!board.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No laps on the board yet. Set the first record!';
      list.append(li);
      return;
    }
    board.forEach((r) => {
      const li = document.createElement('li');
      if (r.id === highlightId) li.classList.add('is-new');
      const name = document.createElement('span');
      name.className = 'lb__name';
      name.textContent = r.name;
      const meta = document.createElement('span');
      meta.className = 'lb__meta';
      meta.textContent = `${DIFFS[r.diff]?.label || ''} · ${CATEGORIES[r.cat]?.label || ''} · ${r.acc}%`;
      name.append(meta);
      const score = document.createElement('span');
      score.className = 'lb__score';
      score.textContent = fmt(r.score);
      li.append(name, score);
      list.append(li);
    });
  }

  el.lbClear.addEventListener('click', () => {
    if (!loadBoard().length) return;
    store.set(KEYS.lb, []);
    renderBoard(el.lbTitle);
    toast('Leaderboard cleared');
  });

  // ---------- race ----------
  let run = null;

  function goalFor(diff, n) { return Math.round((diff.goal * n) / RACE_LEN / 50) * 50; }

  function pickQuestions(cat) {
    const pool = poolFor(cat);
    const seen = new Set(store.get(KEYS.seen, []).filter((x) => typeof x === 'string'));
    const fresh = shuffle(pool.filter((q) => !seen.has(q.q)));
    const stale = shuffle(pool.filter((q) => seen.has(q.q)));
    const picked = fresh.concat(stale).slice(0, Math.min(RACE_LEN, pool.length));
    // Remember what was asked so the next race favours new questions.
    const remaining = fresh.length - picked.length;
    const nextSeen = remaining >= RACE_LEN ? [...seen, ...picked.map((q) => q.q)] : picked.map((q) => q.q);
    store.set(KEYS.seen, nextSeen.slice(-QUESTIONS.length));
    return picked.map((q) => {
      const order = shuffle(q.choices.map((_, i) => i));
      return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
    });
  }

  function startRace() {
    const diff = DIFFS[prefs.diff];
    const questions = pickQuestions(prefs.cat);
    run = {
      diff, diffKey: prefs.diff, cat: prefs.cat, questions,
      goal: goalFor(diff, questions.length),
      i: 0, score: 0, streak: 0, bestStreak: 0, correct: 0,
      times: [], log: [],
      lifelines: { fifty: true, fuel: true },
      phase: 'question',
      saved: false,
    };
    sfx.start();
    el.score.textContent = '0';
    updateStreak();
    setCar(el.carYou, 0);
    setCar(el.carPace, 0);
    show('game');
    renderQuestion();
  }

  function multiplier(streak) { return streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1; }

  function updateStreak() {
    const m = multiplier(run.streak);
    el.streak.textContent = `×${m}`;
    el.streakWrap.classList.toggle('is-hot', m > 1);
  }

  function setCar(node, p) { node.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4)); }

  function bump(node) {
    node.classList.remove('bump');
    void node.offsetWidth; // restart animation
    node.classList.add('bump');
  }

  function renderQuestion() {
    const q = run.questions[run.i];
    run.phase = 'question';
    run.limit = run.diff.time;
    run.elapsed = 0;
    run.lastTick = null;

    el.lap.textContent = `${run.i + 1}/${run.questions.length}`;
    el.cat.textContent = `${CATEGORIES[q.cat].icon} ${CATEGORIES[q.cat].label}`;
    el.question.textContent = q.q;
    el.answers.innerHTML = '';
    q.choices.forEach((text, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'answer';
      b.dataset.idx = idx;
      const key = document.createElement('span');
      key.className = 'answer__key';
      key.textContent = idx + 1;
      const label = document.createElement('span');
      label.textContent = text;
      b.append(key, label);
      b.setAttribute('aria-label', `${idx + 1}: ${text}`);
      b.addEventListener('click', () => answer(idx));
      el.answers.append(b);
    });
    el.feedback.hidden = true;
    el.lifelines.hidden = false;
    el.ll5050.disabled = !run.lifelines.fifty;
    el.llTime.disabled = !run.lifelines.fuel;
    window.scrollTo({ top: 0 });
    el.answers.querySelector('.answer').focus({ preventScroll: true });
    resumeClock();
  }

  // ---------- clock ----------
  let raf = 0;
  let resumedAt = 0;

  function resumeClock() {
    if (!run || run.phase !== 'question') return;
    cancelAnimationFrame(raf);
    resumedAt = performance.now() - run.elapsed * 1000;
    raf = requestAnimationFrame(tick);
  }

  function pauseClock() { cancelAnimationFrame(raf); raf = 0; }

  function tick(now) {
    run.elapsed = (now - resumedAt) / 1000;
    const remaining = Math.max(0, run.limit - run.elapsed);
    const secs = Math.ceil(remaining);
    el.timerNum.textContent = secs;
    el.timebar.style.transform = `scaleX(${remaining / run.limit})`;
    const low = remaining <= 5;
    el.timer.classList.toggle('low', low);
    el.timebar.classList.toggle('low', low);
    if (low && secs !== run.lastTick && secs > 0) { run.lastTick = secs; sfx.tick(); }

    const paceLap = Math.min(run.elapsed / run.diff.time, 1);
    updatePace(run.i + paceLap);

    if (remaining <= 0) { answer(null); return; }
    raf = requestAnimationFrame(tick);
  }

  function updatePace(lapsDone) {
    const frac = lapsDone / run.questions.length;
    setCar(el.carPace, frac);
    setCar(el.carYou, run.score / run.goal);
    const diff = Math.round(run.score - frac * run.goal);
    el.gap.textContent = diff >= 0 ? `+${fmt(diff)} ahead of pace` : `${fmt(-diff)} behind pace`;
    el.gap.className = `track__gap ${diff >= 0 ? 'ahead' : 'behind'}`;
  }

  // ---------- answering ----------
  function answer(idx) {
    if (!run || run.phase !== 'question') return;
    pauseClock();
    run.phase = 'feedback';
    const q = run.questions[run.i];
    const remaining = Math.max(0, run.limit - run.elapsed);
    const ok = idx === q.answer;
    const buttons = [...el.answers.children];
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.answer) b.classList.add('is-correct');
      else if (i === idx) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });

    let points = 0;
    let detail = '';
    if (ok) {
      run.streak += 1;
      run.correct += 1;
      run.bestStreak = Math.max(run.bestStreak, run.streak);
      const speed = Math.round((100 * remaining) / run.limit);
      const m = multiplier(run.streak);
      points = Math.round((100 + speed) * m);
      detail = `+${fmt(points)} pts: 100 base + ${speed} speed${m > 1 ? `, ×${m} nitro` : ''}`;
      if (m > multiplier(run.streak - 1)) { sfx.nitro(); toast(`🔥 Nitro ×${m}!`); } else sfx.correct();
      el.carYou.classList.remove('boost'); void el.carYou.offsetWidth; el.carYou.classList.add('boost');
    } else {
      const lost = run.streak >= 3;
      run.streak = 0;
      detail = idx === null ? 'Out of time. No points.' : 'No points.';
      if (lost) detail += ' Your nitro is gone.';
      sfx.wrong();
      buzz(120);
    }
    run.score += points;
    run.times.push(Math.min(run.elapsed, run.limit));
    run.log.push({ q: q.q, picked: idx === null ? null : q.choices[idx], right: q.choices[q.answer], ok, points });

    el.score.textContent = fmt(run.score);
    if (points) bump(el.score);
    updateStreak();
    updatePace(run.i + 1);

    el.fbVerdict.textContent = ok ? pickLine(GOOD_LINES) : idx === null ? 'Time’s up!' : `Wrong. It's ${q.choices[q.answer]}.`;
    el.fbVerdict.className = `feedback__verdict ${ok ? 'good' : 'bad'}`;
    el.fbPoints.textContent = detail;
    el.fbFact.textContent = q.fact;
    el.next.querySelector('span').textContent = run.i + 1 >= run.questions.length ? 'Cross the finish line' : 'Next lap';
    el.lifelines.hidden = true;
    el.feedback.hidden = false;
    el.next.focus({ preventScroll: true });
    el.feedback.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  const GOOD_LINES = ['Correct!', 'Clean shift!', 'Right on the apex!', 'Smooth as a fresh oil change!', 'Full throttle!'];
  const pickLine = (lines) => lines[Math.floor(Math.random() * lines.length)];

  function next() {
    if (!run || run.phase !== 'feedback') return;
    run.i += 1;
    if (run.i >= run.questions.length) finish();
    else renderQuestion();
  }

  function useFifty() {
    if (!run || run.phase !== 'question' || !run.lifelines.fifty) return;
    run.lifelines.fifty = false;
    el.ll5050.disabled = true;
    const q = run.questions[run.i];
    const wrong = shuffle([0, 1, 2, 3].filter((i) => i !== q.answer)).slice(0, 2);
    wrong.forEach((i) => {
      const b = el.answers.children[i];
      b.disabled = true;
      b.classList.add('is-out');
    });
    const first = [...el.answers.children].find((b) => !b.disabled);
    if (first) first.focus({ preventScroll: true });
    sfx.click();
    toast('Pit crew took out two wrong answers');
  }

  function useFuel() {
    if (!run || run.phase !== 'question' || !run.lifelines.fuel) return;
    run.lifelines.fuel = false;
    el.llTime.disabled = true;
    run.limit += FUEL_SECONDS;
    sfx.click();
    toast(`⛽ +${FUEL_SECONDS} seconds`);
  }

  // ---------- results ----------
  function finish() {
    run.phase = 'done';
    const total = run.questions.length;
    const win = run.score >= run.goal;
    const acc = Math.round((run.correct / total) * 100);
    const avg = run.times.reduce((a, b) => a + b, 0) / total;
    run.acc = acc;

    el.resEyebrow.textContent = run.correct === total ? '🏆 Perfect race' : `${run.diff.label} · ${CATEGORIES[run.cat].label}`;
    el.resTitle.textContent = win ? 'You beat the pace car!' : 'The pace car got there first';
    el.resTitle.classList.toggle('win', win);
    el.resSub.textContent = win
      ? `You finished ${fmt(run.score - run.goal)} pts past the ${fmt(run.goal)} target.`
      : `You needed ${fmt(run.goal - run.score)} more pts. Build nitro streaks and answer faster.`;
    el.resScore.textContent = fmt(run.score);
    el.resAcc.textContent = `${acc}%`;
    el.resStreak.textContent = run.bestStreak;
    el.resSpeed.textContent = avg.toFixed(1);

    el.review.innerHTML = '';
    run.log.forEach((r) => {
      const li = document.createElement('li');
      const q = document.createElement('span');
      q.className = 'r-q';
      q.textContent = r.q;
      const a = document.createElement('span');
      a.className = r.ok ? 'r-good' : 'r-bad';
      a.textContent = r.ok
        ? `✓ ${r.right} (+${fmt(r.points)})`
        : `✗ ${r.picked === null ? 'No answer' : r.picked}. Correct answer: ${r.right}`;
      li.append(q, a);
      el.review.append(li);
    });

    const board = loadBoard();
    const qualifies = board.length < LB_SIZE || run.score > board[board.length - 1].score;
    el.saveForm.hidden = !qualifies || run.score === 0;
    el.saveDone.hidden = qualifies && run.score > 0;
    if (run.score === 0) el.saveDone.textContent = 'Score some points to get on the board.';
    else if (!qualifies) el.saveDone.textContent = `You need ${fmt(board[board.length - 1].score - run.score + 1)} more pts to make the top ${LB_SIZE}.`;
    el.name.value = prefs.name;
    el.lbResults.hidden = qualifies && run.score > 0;
    if (!el.lbResults.hidden) renderBoard(el.lbResults);

    show('results');
    if (win) { sfx.win(); confetti(); } else sfx.lose();
    (el.saveForm.hidden ? el.again : el.name).focus({ preventScroll: true });
  }

  el.saveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!run || run.saved) return;
    const name = el.name.value.replace(/\s+/g, ' ').trim().slice(0, 16);
    if (!name) { el.name.focus(); return; }
    prefs.name = name;
    savePrefs();
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, score: run.score, diff: run.diffKey, cat: run.cat, acc: run.acc, at: Date.now() };
    const board = loadBoard().concat(entry).sort((a, b) => b.score - a.score || a.at - b.at).slice(0, LB_SIZE);
    store.set(KEYS.lb, board);
    run.saved = true;
    const rank = board.findIndex((r) => r.id === entry.id) + 1;
    el.saveForm.hidden = true;
    el.saveDone.hidden = false;
    el.saveDone.textContent = rank === 1 ? '🏆 New track record!' : `Saved. You're #${rank} on the board.`;
    el.lbResults.hidden = false;
    renderBoard(el.lbResults, entry.id);
    el.again.focus({ preventScroll: true });
  });

  el.again.addEventListener('click', startRace);
  el.menu.addEventListener('click', toTitle);
  el.share.addEventListener('click', async () => {
    const grid = run.log.map((r) => (r.ok ? '🟩' : '🟥')).join('');
    const text = `🏁 Car Quiz Grand Prix: ${fmt(run.score)} pts (${run.diff.label}, ${CATEGORIES[run.cat].label})\n${grid} ${run.correct}/${run.questions.length}${run.score >= run.goal ? ', and I beat the pace car!' : ''}`;
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) { await navigator.share({ title: 'Car Quiz Grand Prix', text, url }); return; }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('Result copied to clipboard');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      toast('Couldn’t share. Try a screenshot!');
    }
  });

  function confetti() {
    if (reducedMotion) return;
    const colors = ['#d65a42', '#f2b33d', '#2bb3a3', '#f3e6c8', '#1b1d21'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) {
      const c = document.createElement('i');
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
      c.style.animationDelay = `${Math.random() * 0.5}s`;
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      frag.append(c);
    }
    el.confetti.append(frag);
    setTimeout(() => { el.confetti.innerHTML = ''; }, 4200);
  }

  function toTitle() {
    pauseClock();
    run = null;
    renderBoard(el.lbTitle);
    updateHint();
    show('title');
    el.setup.querySelector('#start').focus({ preventScroll: true });
  }

  // ---------- quit / pause ----------
  el.quit.addEventListener('click', openQuit);
  function openQuit() {
    if (!run || el.quitDialog.open) return;
    pauseClock();
    el.quitDialog.returnValue = '';
    el.quitDialog.showModal();
  }
  el.quitDialog.addEventListener('close', () => {
    if (el.quitDialog.returnValue === 'quit') toTitle();
    else resumeClock();
  });

  document.addEventListener('visibilitychange', () => {
    if (!run || run.phase !== 'question') return;
    if (document.hidden) pauseClock();
    else if (!el.quitDialog.open) resumeClock();
  });

  // ---------- mute ----------
  function renderMute() {
    el.mute.textContent = prefs.muted ? '🔇' : '🔊';
    el.mute.setAttribute('aria-pressed', String(prefs.muted));
    el.mute.setAttribute('aria-label', prefs.muted ? 'Unmute sound' : 'Mute sound');
  }
  function toggleMute() {
    prefs.muted = !prefs.muted;
    savePrefs();
    renderMute();
    if (!prefs.muted) sfx.click();
  }
  el.mute.addEventListener('click', toggleMute);

  el.ll5050.addEventListener('click', useFifty);
  el.llTime.addEventListener('click', useFuel);
  el.next.addEventListener('click', next);

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.target.matches('input, textarea');
    if (typing || el.quitDialog.open) return;
    const key = e.key.toLowerCase();

    if (key === 'm') { toggleMute(); return; }
    if (current === 'title' && key === 'enter' && e.target === document.body) { e.preventDefault(); startRace(); return; }
    if (current !== 'game' || !run) return;

    if (key === 'escape') { e.preventDefault(); openQuit(); return; }
    if (run.phase === 'question') {
      const n = '1234'.indexOf(key) >= 0 ? '1234'.indexOf(key) : 'abcd'.indexOf(key);
      if (n >= 0) {
        const b = el.answers.children[n];
        if (b && !b.disabled) { e.preventDefault(); answer(n); }
      } else if (key === 'f') useFifty();
      else if (key === 't') useFuel();
    } else if (run.phase === 'feedback' && (key === 'enter' || key === ' ')) {
      e.preventDefault();
      next();
    }
  });

  // ---------- boot ----------
  // ---------- Android back button ----------
  if (window.CarQuizApp) {
    window.CarQuizApp.onBack(() => {
      if (el.quitDialog.open) { el.quitDialog.close('stay'); return true; }
      if (current === 'game' && run) { openQuit(); return true; }
      if (current === 'results') { toTitle(); return true; }
      return false;
    });
  }

  buildSetup();
  renderBoard(el.lbTitle);
  renderMute();
})();
