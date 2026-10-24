// Generates HTML previews of the home screen widget from the REAL snapshot
// builder. Run: npx jest --rootDir . --testMatch '**/scripts/widget-preview/*.test.js'
// (from frontend/). Layout mirrors targets/widget/TrackHitConsistencyWidget.swift.
const fs = require('fs');
const path = require('path');
const { buildWidgetSnapshot } = require('../../src/widgetSnapshot');
const { resolvePalette } = require('../../src/theme');

const OUT = process.env.WIDGET_PREVIEW_OUT || '/tmp/widget-preview';
const NOW = new Date(2026, 9, 24, 9, 58);

function sampleHistory() {
  const h = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 190; i >= 0; i -= 1) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - i, 18, 30);
    const dow = d.getDay();
    if (i > 95 && i < 103) continue; // a week off (holiday)
    const r = rnd();
    if ([1, 2, 4, 5].includes(dow) && r < 0.85 || (dow === 3 && r < 0.3) || i === 0) h.push({ timestamp: d.toISOString(), exercises: [{ name: 'Bench' }] });
    else if (dow === 6 && r < 0.45) h.push({ timestamp: d.toISOString(), exercises: [{ name: 'Squat' }] });
    else if (dow === 0 && r < 0.5) h.push({ timestamp: d.toISOString(), exercises: [] }); // logged rest day
  }
  return h;
}

// --- JS port of ConsistencyModel (Swift) ---
function model(snap, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = snap.startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const day = (dt) => {
    if (dt > today) return 'future';
    const idx = Math.round((dt - start) / 86400000);
    const c = idx >= 0 && idx < snap.days.length ? snap.days[idx] : '0';
    return c === '1' ? 'work' : c === '2' ? 'rest' : 'empty';
  };
  const weeks = (n, ago = 0) => {
    const off = (today.getDay() + 6) % 7 + 7 * ago;
    const mon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - off);
    return Array.from({ length: n }, (_, w) => Array.from({ length: 7 }, (_, r) =>
      new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * (n - 1 - w) + r)));
  };
  return { day, weeks, c: snap.colors };
}

function grid(M, weeks, w, h, { wd = false, months = false, ago = 0 } = {}) {
  const cols = M.weeks(weeks, ago);
  const labelW = wd ? 12 : 0, monthH = months ? 14 : 0, gap = weeks > 20 ? 3 : 4;
  const byW = (w - labelW - (wd ? 4 : 0) - gap * (weeks - 1)) / weeks;
  const byH = (h - monthH - gap * 6) / 7;
  const cell = Math.max(4, Math.floor(Math.min(byW, byH)));
  const rad = Math.max(2, Math.round(cell * 0.28));
  const color = { work: M.c.work, rest: M.c.rest, empty: M.c.empty, future: M.c.future };
  const mName = (i) => {
    const mm = cols[i][0].getMonth();
    if (i > 0 && cols[i - 1][0].getMonth() === mm) return '';
    if (i === 0 && cols[i][0].getDate() > 7) return '';
    return cols[i][0].toLocaleString('en-US', { month: 'short' });
  };
  let html = `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center"><div>`;
  if (months) {
    html += `<div style="display:flex;gap:${gap}px;height:${monthH}px">`;
    if (wd) html += `<div style="width:${labelW + 4 - gap}px"></div>`;
    cols.forEach((_, i) => { html += `<div style="width:${cell}px;font-size:9px;font-weight:500;color:${M.c.textMuted};white-space:nowrap;overflow:visible">${mName(i)}</div>`; });
    html += '</div>';
  }
  html += `<div style="display:flex;gap:${gap}px">`;
  if (wd) {
    html += `<div style="display:flex;flex-direction:column;gap:${gap}px;margin-right:${4 - gap}px">`;
    'MTWTFSS'.split('').forEach((l) => { html += `<div style="width:${labelW}px;height:${cell}px;line-height:${cell}px;font-size:8px;font-weight:600;text-align:center;color:${M.c.textMuted}">${l}</div>`; });
    html += '</div>';
  }
  cols.forEach((col) => {
    html += `<div style="display:flex;flex-direction:column;gap:${gap}px">`;
    col.forEach((dt) => { html += `<div style="width:${cell}px;height:${cell}px;border-radius:${rad}px;background:${color[M.day(dt)]}"></div>`; });
    html += '</div>';
  });
  return html + '</div></div></div>';
}

const title = (c) => `<div style="display:flex;gap:4px;align-items:center;color:${c.textSubtle};font-size:10px;font-weight:600;letter-spacing:.8px"><span>🔥</span>CONSISTENCY</div>`;
const stat = (v, l, c, big) => `<div><div style="font-family:Menlo,'DejaVu Sans Mono',monospace;font-weight:700;font-size:${big ? 22 : 17}px;color:${c.text}">${v}</div><div style="font-size:8px;font-weight:600;letter-spacing:.8px;color:${c.textSubtle}">${l.toUpperCase()}</div></div>`;
const rule = (c, v = true) => (v ? `<div style="width:1px;height:28px;background:${c.border}"></div>` : `<div style="height:1px;background:${c.border}"></div>`);

const SIZES = { small: [158, 158], medium: [338, 158], large: [338, 354] };
const PAD = 16;

function widget(family, snap) {
  const M = model(snap, NOW);
  const c = snap.colors;
  const [W, H] = SIZES[family];
  const iw = W - 2 * PAD, ih = H - 2 * PAD;
  let inner;
  if (!snap.hasData) {
    inner = `<div style="display:flex;flex-direction:column;height:100%;gap:6px">${title(c)}<div style="flex:1"></div><div style="font-size:${family === 'small' ? 14 : 16}px;font-weight:600;color:${c.text}">No workouts yet</div><div style="font-size:11px;color:${c.textMuted}">Log a workout in TrackHit to start your map.</div><div style="flex:1"></div></div>`;
  } else if (family === 'small') {
    inner = `<div style="display:flex;flex-direction:column;gap:8px">${title(c)}<div style="display:flex;align-items:baseline;gap:6px"><span style="font-family:Menlo,'DejaVu Sans Mono',monospace;font-weight:700;font-size:20px;color:${c.text}">${snap.score}%</span><span style="font-size:10px;font-weight:600;color:${c.textSubtle}">${snap.activeDays} days</span></div>${grid(M, 8, iw, ih - 8 - 14 - 8 - 26)}</div>`;
  } else if (family === 'medium') {
    inner = `<div style="display:flex;gap:12px;align-items:center;height:100%"><div style="width:84px;display:flex;flex-direction:column;gap:8px">${title(c)}${stat(snap.score + '%', 'Score', c, true)}${stat(snap.activeDays, 'Days', c)}</div>${grid(M, 17, iw - 96, ih, { months: true })}</div>`;
  } else {
    inner = `<div style="display:flex;flex-direction:column;gap:10px">${title(c)}<div style="display:flex;gap:18px;align-items:center">${stat(snap.score + '%', 'Score', c, true)}${rule(c)}${stat(snap.activeDays, 'Days', c, true)}${rule(c)}${stat(snap.streak, 'Day streak', c, true)}</div>${rule(c, false)}${grid(M, 13, iw, (ih - 14 - 10 - 40 - 10 - 1 - 10 - 10 - 10 - 11) / 2, { wd: true, months: true, ago: 13 })}${grid(M, 13, iw, (ih - 14 - 10 - 40 - 10 - 1 - 10 - 10 - 10 - 11) / 2, { wd: true, months: true })}<div style="display:flex;gap:12px">${['work:Workout', 'rest:Rest', 'empty:Missed'].map((s) => { const [k, l] = s.split(':'); return `<div style="display:flex;gap:4px;align-items:center"><div style="width:9px;height:9px;border-radius:2px;background:${c[k]}"></div><span style="font-size:9px;font-weight:500;color:${c.textMuted}">${l}</span></div>`; }).join('')}</div></div>`;
  }
  return `<div style="width:${W}px;height:${H}px;border-radius:22px;background:${c.background};padding:${PAD}px;box-sizing:border-box;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.5)">${inner}</div>`;
}

function page(body, w, h) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;width:${w}px;height:${h}px;background:linear-gradient(160deg,#1b2a3a,#0b0f14 60%,#2a1b2e);font-family:-apple-system,'SF Pro Text','Inter','DejaVu Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:24px}.lbl{color:#cfd6dd;font-size:12px;text-align:center;margin-top:8px}</style></head><body>${body}</body></html>`;
}

test('generate widget previews', () => {
  fs.mkdirSync(OUT, { recursive: true });
  const colors = resolvePalette('dark');
  const snap = buildWidgetSnapshot({ workoutHistory: sampleHistory(), colors, now: NOW });
  const empty = buildWidgetSnapshot({ workoutHistory: [], colors, now: NOW });
  fs.writeFileSync(path.join(OUT, 'snapshot.json'), JSON.stringify(snap, null, 2));
  const one = (f, s, lbl) => `<div>${widget(f, s)}<div class="lbl">${lbl}</div></div>`;
  fs.writeFileSync(path.join(OUT, 'small.html'), page(one('small', snap, 'Small'), 260, 240));
  fs.writeFileSync(path.join(OUT, 'medium.html'), page(one('medium', snap, 'Medium'), 440, 240));
  fs.writeFileSync(path.join(OUT, 'large.html'), page(one('large', snap, 'Large'), 440, 440));
  fs.writeFileSync(path.join(OUT, 'empty.html'), page(one('small', empty, 'Small — empty') + one('medium', empty, 'Medium — empty'), 620, 240));
  fs.writeFileSync(path.join(OUT, 'all.html'), `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px;width:740px;background:linear-gradient(160deg,#1b2a3a,#0b0f14 60%,#2a1b2e);font-family:-apple-system,'Inter','DejaVu Sans',sans-serif}.row{display:flex;gap:24px;margin-bottom:24px}</style></head><body><div class="row">${widget('small', snap)}${widget('medium', snap)}</div><div class="row">${widget('large', snap)}<div style="display:flex;flex-direction:column;gap:24px">${widget('small', empty)}</div></div></body></html>`);
  expect(snap.hasData).toBe(true);
});
