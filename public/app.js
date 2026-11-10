(() => {
  'use strict';

  /* ───────── storage ─────────
     Amounts are stored as integer quarters (q): ¼ = 1, ½ = 2, whole = 4.
     That keeps sums exact (no 0.1 + 0.2 floating point drift). */

  const KEY = 'tofu.v1';
  const DEFAULT_SETTINGS = { grams: 200 };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.entries)) {
        return { entries: s.entries, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
      }
    } catch (_) { /* fall through to empty */ }
    return { entries: [], settings: { ...DEFAULT_SETTINGS } };
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {
      toast('could not save this, sorry');
    }
  }

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ───────── formatting ───────── */

  const FRAC = ['', '¼', '½', '¾'];

  function fmt(q) {
    if (!q) return '0';
    const whole = Math.floor(q / 4);
    const rest = q % 4;
    if (!rest) return String(whole);
    return (whole ? whole : '') + FRAC[rest];
  }
  const unit = (q) => (q > 0 && q <= 4 ? 'block' : 'blocks');

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7)); // monday
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const WDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function niceDay(k) {
    const d = fromKey(k);
    const diff = daysBetween(d, new Date());
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    const base = `${WDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
  }

  function totalsByDay() {
    const m = new Map();
    for (const e of state.entries) {
      const k = dayKey(new Date(e.t));
      m.set(k, (m.get(k) || 0) + e.q);
    }
    return m;
  }

  /* ───────── hand-printed tofu ───────── */

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function tofuSVG(w, h, d, seed) {
    const r = rng(seed);
    const j = (v) => +(v + (r() - 0.5) * 3).toFixed(1); // a little hand wobble
    const dx = d * 0.78, dy = d * 0.52, p = 8;
    const P = (x, y) => [j(x), j(y)];
    const A = P(p, p + dy), B = P(p + w, p + dy), C = P(p + w, p + dy + h), D = P(p, p + dy + h);
    const A2 = P(A[0] + dx, A[1] - dy), B2 = P(B[0] + dx, B[1] - dy), C2 = P(C[0] + dx, C[1] - dy);
    const poly = (...pts) => 'M' + pts.map((q) => q.join(',')).join('L') + 'Z';
    const line = (a, b) => `M${a.join(',')}L${b.join(',')}`;
    const W = Math.ceil(w + dx + p * 2 + 4), H = Math.ceil(h + dy + p * 2 + 4);

    const silhouette = poly(A, A2, B2, C2, C, D);
    return `
<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="ink" d="${silhouette}" fill="#ffe800"/>
  <g class="ink" transform="translate(3 2)">
    <path d="${poly(B, B2, C2, C)}" fill="#ff48b0"/>
    <path d="${poly(A, B, C, D)}" fill="url(#dots-pink)" opacity=".75"/>
  </g>
  <g class="ink" transform="translate(-1.5 -1)" fill="none" stroke="#0078bf" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="${silhouette}"/>
    <path d="${line(A, B)} ${line(B, B2)} ${line(B, C)}"/>
  </g>
</svg>`;
  }

  const SHAPES = {
    whole: () => tofuSVG(150, 92, 64, 7),
    // sliced like a real block: half = cut across, quarter = cut again lengthwise
    half: () => tofuSVG(75, 92, 64, 3),
    quarter: () => tofuSVG(75, 46, 64, 11),
  };
  document.querySelectorAll('.tofu-art').forEach((el) => {
    el.innerHTML = SHAPES[el.dataset.shape]();
  });

  /* ───────── toast with undo ───────── */

  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastUndo = document.getElementById('toast-undo');
  let toastTimer = null;
  let undoFn = null;

  function toast(msg, onUndo) {
    clearTimeout(toastTimer);
    toastMsg.textContent = msg;
    undoFn = onUndo || null;
    toastUndo.hidden = !onUndo;
    toastEl.hidden = false;
    // restart the entrance animation
    toastEl.style.animation = 'none';
    void toastEl.offsetWidth;
    toastEl.style.animation = '';
    toastTimer = setTimeout(hideToast, onUndo ? 5000 : 2600);
  }
  function hideToast() { toastEl.hidden = true; undoFn = null; }
  toastUndo.addEventListener('click', () => {
    const fn = undoFn;
    hideToast();
    if (fn) fn();
  });

  /* ───────── mutations ───────── */

  function addEntry(q, t = Date.now()) {
    const e = { id: newId(), t, q };
    state.entries.push(e);
    save();
    renderAll();
    return e;
  }
  function removeEntry(id) {
    const i = state.entries.findIndex((e) => e.id === id);
    if (i < 0) return null;
    const [e] = state.entries.splice(i, 1);
    save();
    renderAll();
    return e;
  }
  function restoreEntry(e) {
    state.entries.push(e);
    save();
    renderAll();
  }

  /* ───────── today ───────── */

  const countEl = document.getElementById('today-count');
  const labelEl = document.getElementById('today-label');
  const dateEl = document.getElementById('today-date');

  function renderToday() {
    const now = new Date();
    const q = totalsByDay().get(dayKey(now)) || 0;
    countEl.textContent = fmt(q);
    labelEl.textContent = `${unit(q)} today`;
    dateEl.textContent = now
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      .toLowerCase();
  }

  function fly(btn, text) {
    const r = btn.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'fly';
    el.textContent = text;
    el.style.left = r.left + r.width / 2 + 'px';
    el.style.top = r.top + r.height * 0.25 + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  document.querySelectorAll('#view-today .tofu').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = Number(btn.dataset.q);
      const e = addEntry(q);
      btn.classList.remove('stamp');
      void btn.offsetWidth;
      btn.classList.add('stamp');
      countEl.classList.add('bump');
      setTimeout(() => countEl.classList.remove('bump'), 220);
      fly(btn, '+' + fmt(q));
      toast(`+${fmt(q)} ${unit(q)}`, () => removeEntry(e.id));
    });
  });

  /* ───────── the past: figures & streaks ───────── */

  function weight(q) {
    const g = (q / 4) * (Number(state.settings.grams) || DEFAULT_SETTINGS.grams);
    if (g >= 1000) return `${(g / 1000).toFixed(g >= 100000 ? 0 : 1)} kg`;
    return `${Math.round(g)} g`;
  }

  function renderFigures(byDay) {
    const now = new Date();
    const wk = startOfWeek(now), mo = startOfMonth(now);
    let total = 0, week = 0, month = 0, first = null;
    for (const [k, q] of byDay) {
      const d = fromKey(k);
      total += q;
      if (d >= wk) week += q;
      if (d >= mo) month += q;
      if (!first || d < first) first = d;
    }
    const span = first ? daysBetween(first, now) + 1 : 0;
    const avg = span ? total / 4 / span : 0;
    const tofuDays = [...byDay.values()].filter((q) => q > 0).length;

    const fig = (num, label, sub = '', blob = false) => `
      <div class="fig">
        ${blob ? '<span class="fig-blob"></span>' : ''}
        <span class="fig-num">${num}</span>
        <span class="fig-label">${label}</span>
        ${sub ? `<span class="fig-sub">${sub}</span>` : ''}
      </div>`;

    document.getElementById('figures').innerHTML =
      fig(fmt(total), `${unit(total)}, all time`, total ? `that’s about ${weight(total)} of tofu` : 'nothing yet. go eat some tofu.', true) +
      fig(fmt(week), 'this week') +
      fig(fmt(month), 'this month') +
      fig(avg ? avg.toFixed(avg < 1 ? 2 : 1) : '0', 'per day, on average') +
      fig(tofuDays, tofuDays === 1 ? 'tofu day' : 'tofu days');
  }

  function streaks(byDay) {
    const has = (d) => (byDay.get(dayKey(d)) || 0) > 0;
    let d = startOfDay(new Date());
    if (!has(d)) d = addDays(d, -1); // today isn't over yet
    let current = 0;
    while (has(d)) { current++; d = addDays(d, -1); }

    const keys = [...byDay.keys()].filter((k) => byDay.get(k) > 0).sort();
    let longest = 0, run = 0, prev = null;
    for (const k of keys) {
      const day = fromKey(k);
      run = prev && daysBetween(prev, day) === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = day;
    }
    return { current, longest };
  }

  function renderStreaks(byDay) {
    const { current, longest } = streaks(byDay);
    const days = (n) => (n === 1 ? 'day' : 'days');
    document.getElementById('streaks').innerHTML = `
      <div class="streak ${current ? 'on' : ''}"><b>${current}</b><span>${days(current)} in a row,<br>right now</span></div>
      <div class="streak"><b>${longest}</b><span>${days(longest)},<br>longest run</span></div>`;
  }

  /* ───────── the past: bars ───────── */

  let period = 'week';
  let selected = null;

  function buckets(byDay) {
    const now = new Date();
    const n = 12;
    const out = [];
    if (period === 'week') {
      const first = addDays(startOfWeek(now), -7 * (n - 1));
      for (let i = 0; i < n; i++) {
        const s = addDays(first, 7 * i);
        out.push({ q: 0, label: `${s.getDate()} ${MONTHS[s.getMonth()]}`, long: `week of ${s.getDate()} ${MONTHS[s.getMonth()]}` });
      }
      for (const [k, q] of byDay) {
        const i = Math.floor(daysBetween(first, fromKey(k)) / 7);
        if (i >= 0 && i < n) out[i].q += q;
      }
    } else {
      const y0 = now.getFullYear(), m0 = now.getMonth() - (n - 1);
      for (let i = 0; i < n; i++) {
        const s = new Date(y0, m0 + i, 1);
        out.push({ q: 0, label: MONTHS[s.getMonth()], long: `${MONTHS[s.getMonth()]} ${s.getFullYear()}` });
      }
      const first = new Date(y0, m0, 1);
      for (const [k, q] of byDay) {
        const d = fromKey(k);
        const i = (d.getFullYear() - first.getFullYear()) * 12 + d.getMonth() - first.getMonth();
        if (i >= 0 && i < n) out[i].q += q;
      }
    }
    return out;
  }

  function barPath(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    const b = y + h;
    return `M${x},${b}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${b}Z`;
  }

  function renderChart(byDay) {
    const data = buckets(byDay);
    const el = document.getElementById('chart');
    document.getElementById('chart-title').textContent = period === 'week' ? 'blocks per week' : 'blocks per month';

    if (!data.some((b) => b.q)) {
      el.innerHTML = `<p class="chart-empty">no tofu in these ${period}s yet</p>`;
      return;
    }

    const W = 340, H = 200, top = 26, bottom = 26;
    const plotH = H - top - bottom;
    const band = W / data.length;
    const bw = Math.round(band * 0.6);
    const max = Math.max(4, ...data.map((b) => b.q));
    const maxIdx = data.reduce((best, b, i) => (b.q > data[best].q ? i : best), 0);
    const last = data.length - 1;
    const base = top + plotH;

    let bars = '', labels = '', hits = '', vals = '';
    data.forEach((b, i) => {
      const x = Math.round(i * band + (band - bw) / 2);
      const h = (b.q / max) * plotH;
      const y = base - h;
      if (b.q) {
        bars += `<path class="bar-ink" d="${barPath(x + 3, y - 2, bw, h + 2, 4)}" fill="#ff48b0"/>`;
        bars += `<path class="bar-ink" d="${barPath(x, y, bw, h, 4)}" fill="url(#dots-blue)" stroke="#0078bf" stroke-width="2"/>`;
      } else {
        bars += `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#6b6573" opacity=".35"/>`;
      }
      const showLabel = period === 'month' || (last - i) % 3 === 0;
      if (showLabel) {
        labels += `<text class="axis" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${b.label}</text>`;
      }
      const showVal = b.q && (i === selected || (selected === null && (i === maxIdx || i === last)));
      if (showVal) {
        vals += `<text class="val" x="${x + bw / 2 + 1}" y="${y - 8}" text-anchor="middle">${fmt(b.q)}</text>`;
      }
      if (i === selected) {
        labels += `<rect class="sel-mark" x="${x}" y="${base + 4}" width="${bw}" height="3" rx="1.5"/>`;
      }
      hits += `<rect class="hit" data-i="${i}" x="${i * band}" y="0" width="${band}" height="${H}"
                 role="img" aria-label="${b.long}: ${fmt(b.q)} ${unit(b.q)}"/>`;
    });

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" x2="${W}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="#2c2a35" stroke-opacity=".4" stroke-width="1"/>
        ${bars}${vals}${labels}${hits}
      </svg>`;

    el.querySelectorAll('.hit').forEach((r) => {
      r.addEventListener('click', () => {
        const i = Number(r.dataset.i);
        selected = selected === i ? null : i;
        renderChart(totalsByDay());
        if (selected !== null) {
          const b = data[i];
          toast(`${b.long}: ${fmt(b.q)} ${unit(b.q)}`);
        }
      });
    });
  }

  document.querySelectorAll('.chart-head .seg button').forEach((b) => {
    b.addEventListener('click', () => {
      period = b.dataset.period;
      selected = null;
      document.querySelectorAll('.chart-head .seg button').forEach((x) =>
        x.setAttribute('aria-selected', String(x === b)));
      renderChart(totalsByDay());
    });
  });

  /* ───────── the past: diary ───────── */

  let logDays = 10;
  const AMOUNTS = [1, 2, 4];

  function renderLog(byDay) {
    const groups = new Map();
    const sorted = [...state.entries].sort((a, b) => b.t - a.t);
    for (const e of sorted) {
      const k = dayKey(new Date(e.t));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
    const keys = [...groups.keys()];
    const logEl = document.getElementById('log');
    if (!keys.length) {
      logEl.innerHTML = '<p class="log-empty">the diary is empty.</p>';
      document.getElementById('log-more').hidden = true;
      return;
    }

    logEl.innerHTML = keys.slice(0, logDays).map((k) => {
      const rows = groups.get(k).slice().sort((a, b) => a.t - b.t).map((e) => {
        const d = new Date(e.t);
        const seg = AMOUNTS.map((q) =>
          `<button data-edit="${e.id}" data-q="${q}" aria-selected="${e.q === q}" aria-label="set to ${fmt(q)}">${fmt(q)}</button>`).join('');
        return `
          <div class="entry">
            <span class="entry-time">${pad(d.getHours())}:${pad(d.getMinutes())}</span>
            <div class="seg">${seg}</div>
            <button class="entry-del" data-del="${e.id}" aria-label="remove">×</button>
          </div>`;
      }).join('');
      const q = byDay.get(k) || 0;
      return `
        <div class="day">
          <div class="day-head"><span class="day-name">${niceDay(k)}</span><span class="day-total">${fmt(q)}</span></div>
          ${rows}
        </div>`;
    }).join('');

    document.getElementById('log-more').hidden = keys.length <= logDays;
  }

  document.getElementById('log').addEventListener('click', (ev) => {
    const edit = ev.target.closest('[data-edit]');
    const del = ev.target.closest('[data-del]');
    if (edit) {
      const e = state.entries.find((x) => x.id === edit.dataset.edit);
      const q = Number(edit.dataset.q);
      if (!e || e.q === q) return;
      const before = e.q;
      e.q = q;
      save();
      renderAll();
      toast(`changed to ${fmt(q)}`, () => { e.q = before; save(); renderAll(); });
    } else if (del) {
      const e = removeEntry(del.dataset.del);
      if (e) toast(`removed ${fmt(e.q)} ${unit(e.q)}`, () => restoreEntry(e));
    }
  });

  document.getElementById('log-more').addEventListener('click', () => {
    logDays += 14;
    renderLog(totalsByDay());
  });

  // add to a forgotten day
  const pastDate = document.getElementById('past-date');
  function resetPastDate() {
    const today = new Date();
    pastDate.max = dayKey(today);
    if (!pastDate.value) pastDate.value = dayKey(addDays(today, -1));
  }
  document.querySelectorAll('.seg-amt button').forEach((b) => {
    b.addEventListener('click', () => {
      if (!pastDate.value) return;
      const k = pastDate.value;
      const day = fromKey(k);
      if (day > new Date()) { toast('that day hasn’t happened yet'); return; }
      const isToday = k === dayKey(new Date());
      const t = isToday ? Date.now() : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).getTime();
      const q = Number(b.dataset.q);
      const e = addEntry(q, t);
      toast(`+${fmt(q)} on ${niceDay(k)}`, () => removeEntry(e.id));
    });
  });
  document.getElementById('add-past').addEventListener('submit', (e) => e.preventDefault());

  /* ───────── settings & backup ───────── */

  const gramsEl = document.getElementById('grams');
  gramsEl.addEventListener('change', () => {
    const g = Math.round(Number(gramsEl.value));
    if (g >= 10 && g <= 5000) {
      state.settings.grams = g;
      save();
    }
    gramsEl.value = state.settings.grams;
    renderFigures(totalsByDay());
  });

  document.getElementById('export').addEventListener('click', async () => {
    const payload = JSON.stringify({
      app: 'tofu-tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      entries: state.entries,
    });
    const name = `tofu-backup-${dayKey(new Date())}.json`;
    const file = new File([payload], name, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'tofu backup' });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  document.getElementById('import').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    let data;
    try {
      data = JSON.parse(await f.text());
    } catch (_) {
      toast('that file isn’t a tofu backup');
      return;
    }
    const list = Array.isArray(data) ? data : data && data.entries;
    if (!Array.isArray(list)) { toast('that file isn’t a tofu backup'); return; }

    const snapshot = { entries: state.entries.slice(), settings: { ...state.settings } };
    const seen = new Set(state.entries.map((e) => e.id));
    let added = 0;
    for (const raw of list) {
      const t = Number(raw && raw.t);
      const q = Number(raw && raw.q);
      if (!Number.isFinite(t) || !Number.isInteger(q) || q < 1 || q > 64) continue;
      const id = typeof raw.id === 'string' && raw.id ? raw.id : newId();
      if (seen.has(id)) continue;
      seen.add(id);
      state.entries.push({ id, t, q });
      added++;
    }
    save();
    renderAll();
    toast(`loaded ${added} new ${added === 1 ? 'entry' : 'entries'}`, added ? () => {
      state = snapshot;
      save();
      renderAll();
    } : null);
  });

  /* ───────── views ───────── */

  const views = { today: document.getElementById('view-today'), past: document.getElementById('view-past') };
  let current = 'today';

  function show(name) {
    if (!views[name]) name = 'today';
    current = name;
    for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
    document.querySelectorAll('.tabs button').forEach((b) => {
      if (b.dataset.view === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    history.replaceState(null, '', name === 'today' ? location.pathname : '#past');
    renderAll();
  }
  document.querySelectorAll('.tabs button').forEach((b) =>
    b.addEventListener('click', () => show(b.dataset.view)));

  function renderPast() {
    const byDay = totalsByDay();
    renderFigures(byDay);
    renderStreaks(byDay);
    renderChart(byDay);
    renderLog(byDay);
    resetPastDate();
    gramsEl.value = state.settings.grams;
  }

  function renderAll() {
    renderToday();
    if (current === 'past') renderPast();
  }

  // a new day may have started while the app sat in the background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderAll();
  });
  // another tab/window changed the data
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { state = load(); renderAll(); }
  });

  show(location.hash === '#past' ? 'past' : 'today');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
