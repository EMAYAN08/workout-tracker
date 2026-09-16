import { Platform, Share as RNShare, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import { convertWeight, calculateVolume } from './calculations';
import { titleCase, muscleTagColors } from './format';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;');
}

export function dayWorkoutStats(dayWorkouts, unit) {
  const list = Array.isArray(dayWorkouts) ? dayWorkouts : [];
  const totalDuration = list.reduce((acc, wk) => acc + (wk.duration || 0), 0);
  const totalVolume = list.reduce(
    (acc, wk) =>
      acc +
      convertWeight(
        wk.exercises?.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0) || 0,
        wk.unitSaved || 'lbs',
        unit
      ),
    0
  );
  const exerciseCount = list.reduce((acc, wk) => acc + (wk.exercises?.length || 0), 0);
  return {
    minutes: Math.round(totalDuration / 60),
    volume: Math.round(totalVolume),
    exerciseCount,
  };
}

function pdfSafe(value) {
  return String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function rgb(hex) {
  const h = String(hex || '#000000').replace('#', '');
  if (h.length < 6) return '0 0 0';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;

function makeDoc(c) {
  const pages = [];
  let ops = [];
  let y = PAGE_H - MARGIN;

  const flush = () => {
    if (ops.length) pages.push(ops.join('\n'));
    ops = [];
  };

  const fillPage = () => {
    ops.push(`q ${rgb(c.background)} rg 0 0 ${PAGE_W} ${PAGE_H} re f Q`);
    y = PAGE_H - MARGIN;
  };

  const newPage = () => {
    flush();
    fillPage();
  };

  const ensure = (need) => {
    if (y - need < MARGIN + 24) newPage();
  };

  const rect = (x, bottom, w, h, fill, stroke) => {
    const parts = ['q'];
    if (fill) parts.push(`${rgb(fill)} rg`);
    if (stroke) parts.push(`${rgb(stroke)} RG`, '0.8 w');
    parts.push(`${x.toFixed(2)} ${bottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    parts.push(fill && stroke ? 'B' : fill ? 'f' : 'S', 'Q');
    ops.push(parts.join(' '));
  };

  const text = (str, x, baseline, size, color, bold) => {
    const font = bold ? 'F2' : 'F1';
    ops.push(
      `q ${rgb(color)} rg BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfSafe(str)}) Tj ET Q`
    );
  };

  fillPage();
  return { pages, flush, newPage, ensure, rect, text, get y() { return y; }, set y(v) { y = v; } };
}

export function buildWorkoutDayPdfString({ date, dayWorkouts, unit, colors, isDark }) {
  const c = {
    background: colors?.background || '#070707',
    surface: colors?.surface || '#111111',
    surface2: colors?.surface2 || '#181818',
    surfaceLight: colors?.surfaceLight || '#181818',
    text: colors?.text || '#F4F4F2',
    muted: colors?.textMuted || '#9A9A96',
    subtle: colors?.textSubtle || '#6A6A66',
    border: colors?.border || '#2A2A2A',
    accent: colors?.chartAccent || colors?.accent || '#9AAA78',
  };
  const displayDate = date ? format(parseISO(date), 'EEEE, MMM d, yyyy') : 'Workout';
  const stats = dayWorkoutStats(dayWorkouts, unit);
  const innerW = PAGE_W - MARGIN * 2;
  const doc = makeDoc(c);

  doc.text('TRACKIT', MARGIN, doc.y - 10, 10, c.subtle, true);
  doc.text(String(unit || 'lbs').toUpperCase(), PAGE_W - MARGIN - 28, doc.y - 10, 10, c.subtle, true);
  doc.y -= 28;
  doc.text(displayDate, MARGIN, doc.y - 6, 22, c.text, true);
  doc.y -= 36;

  const meta = `${stats.minutes} mins    ${stats.volume.toLocaleString()} ${unit}    ${stats.exerciseCount} Exercises`;
  doc.text(meta, MARGIN, doc.y, 11, c.muted, false);
  doc.y -= 8;
  doc.rect(MARGIN, doc.y - 2, innerW, 0.6, c.border);
  doc.y -= 18;

  (dayWorkouts || []).forEach((workout, wIdx) => {
    const isRest = !workout.exercises || workout.exercises.length === 0;
    const title = isRest ? 'Rest Day' : workout.routineName || `Workout ${wIdx + 1}`;
    const time = workout.startTime ? format(new Date(workout.startTime), 'h:mm a') : 'Completed';
    const exercises = workout.exercises || [];
    const restH = 92;
    const exH = (ex) => 28 + 18 + 16 + 18 + (ex.sets?.length || 1) * 18 + 16;
    const cardH = isRest
      ? restH
      : 40 + exercises.reduce((sum, ex) => sum + exH(ex), 0) + 8;

    doc.ensure(Math.min(cardH, 220));
    const top = doc.y;
    const bottom = top - cardH;
    doc.rect(MARGIN, bottom, innerW, cardH, c.surface, c.border);
    doc.rect(MARGIN, top - 36, innerW, 36, c.surfaceLight, c.border);
    doc.text(title, MARGIN + 14, top - 23, 13, c.text, true);
    doc.text(time, PAGE_W - MARGIN - 90, top - 23, 10, c.muted, true);

    if (isRest) {
      doc.text('Active Recovery Logged', MARGIN + 14, top - 58, 13, c.text, true);
      doc.text('Rest day logged so the map stays honest.', MARGIN + 14, top - 76, 11, c.muted, false);
      doc.y = bottom - 14;
      return;
    }

    let cy = top - 52;
    exercises.forEach((exercise) => {
      const need = exH(exercise);
      if (cy - need < bottom + 10) {
        doc.y = bottom - 14;
        doc.ensure(need + 48);
        cy = doc.y;
      }
      const tag = muscleTagColors(exercise.muscleGroup, isDark);
      doc.text(exercise.name || 'Exercise', MARGIN + 14, cy, 12, c.text, true);
      cy -= 16;
      const tagLabel = titleCase(exercise.muscleGroup) || 'Other';
      const tagW = Math.max(42, tagLabel.length * 6 + 16);
      doc.rect(MARGIN + 14, cy - 4, tagW, 14, tag.bg);
      doc.text(tagLabel.toUpperCase(), MARGIN + 20, cy, 8, tag.fg, true);
      cy -= 20;
      doc.text('SET', MARGIN + 18, cy, 9, c.muted, true);
      doc.text('WEIGHT', MARGIN + 160, cy, 9, c.muted, true);
      doc.text('REPS', MARGIN + 340, cy, 9, c.muted, true);
      cy -= 6;
      doc.rect(MARGIN + 14, cy, innerW - 28, 0.5, c.border);
      cy -= 14;
      (exercise.sets || []).forEach((set, sIdx) => {
        if (cy < MARGIN + 28) {
          doc.newPage();
          cy = doc.y;
        }
        const w = convertWeight(set.weight, workout.unitSaved || 'lbs', unit);
        doc.text(String(sIdx + 1), MARGIN + 18, cy, 11, c.muted, true);
        doc.text(`${w} ${unit}`, MARGIN + 160, cy, 11, c.accent, true);
        doc.text(String(set.reps ?? '—'), MARGIN + 340, cy, 11, c.text, true);
        cy -= 18;
      });
      cy -= 10;
    });
    doc.y = Math.min(doc.y, cy) - 8;
    doc.y = Math.min(doc.y, bottom - 14);
  });

  doc.ensure(24);
  doc.text('Logged on this device  ·  TrackIt', MARGIN, MARGIN, 9, c.subtle, false);
  doc.flush();

  const pageStreams = doc.pages;
  const n = pageStreams.length;
  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = pageStreams.map((_, i) => 3 + n + i);
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${n} >>`);
  pageStreams.forEach((stream) => {
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  pageStreams.forEach((_, i) => {
    const contentId = 3 + i;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${3 + 2 * n} 0 R /F2 ${4 + 2 * n} 0 R >> >> >>`
    );
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let out = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = out.length;
  out += `xref\n0 ${objects.length + 1}\n`;
  out += '0000000000 65535 f \n';
  offsets.slice(1).forEach((off) => {
    out += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return out;
}

export function buildWorkoutDayHtml({ date, dayWorkouts, unit, colors, isDark }) {
  const displayDate = date ? format(parseISO(date), 'EEEE, MMM d, yyyy') : '';
  const stats = dayWorkoutStats(dayWorkouts, unit);
  const c = colors || {};
  const bg = c.background || '#070707';
  const surface = c.surface || '#111111';
  const surface2 = c.surface2 || '#181818';
  const surfaceLight = c.surfaceLight || surface2;
  const text = c.text || '#F4F4F2';
  const muted = c.textMuted || '#9A9A96';
  const subtle = c.textSubtle || '#6A6A66';
  const border = c.border || '#2A2A2A';
  const accent = c.chartAccent || c.accent || '#9AAA78';

  const cards = (dayWorkouts || [])
    .map((workout, wIdx) => {
      const isRest = !workout.exercises || workout.exercises.length === 0;
      const title = isRest ? 'Rest Day' : workout.routineName || `Workout ${wIdx + 1}`;
      const time = workout.startTime ? format(new Date(workout.startTime), 'h:mm a') : 'Completed';
      if (isRest) {
        return `
          <section class="card">
            <header class="card-head">
              <div class="card-title">${esc(title)}</div>
              <div class="card-time">${esc(time)}</div>
            </header>
            <div class="rest">
              <div class="rest-title">Active Recovery Logged</div>
              <div class="rest-sub">You took a well-deserved rest day to let your muscles recover and grow.</div>
            </div>
          </section>`;
      }
      const exercises = (workout.exercises || [])
        .map((exercise) => {
          const tag = muscleTagColors(exercise.muscleGroup, isDark);
          const rows = (exercise.sets || [])
            .map((set, sIdx) => {
              const w = convertWeight(set.weight, workout.unitSaved || 'lbs', unit);
              return `
                <tr>
                  <td class="muted num">${sIdx + 1}</td>
                  <td class="accent">${esc(w)} <span class="unit">${esc(unit)}</span></td>
                  <td>${esc(set.reps ?? '—')}</td>
                </tr>`;
            })
            .join('');
          return `
            <article class="ex">
              <div class="ex-head">
                <div>
                  <div class="ex-name">${esc(exercise.name)}</div>
                  <span class="tag" style="background:${tag.bg};color:${tag.fg}">${esc(titleCase(exercise.muscleGroup))}</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th class="num">Set</th>
                    <th>Weight</th>
                    <th>Reps</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </article>`;
        })
        .join('');
      return `
        <section class="card">
          <header class="card-head">
            <div class="card-title">${esc(title)}</div>
            <div class="card-time">${esc(time)}</div>
          </header>
          <div class="card-body">${exercises}</div>
        </section>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: ${bg}; color: ${text}; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; }
    body { padding: 36px 32px 44px; }
  </style>
</head>
<body>
  <div style="letter-spacing:3px;text-transform:uppercase;color:${subtle};font-size:11px;font-weight:600">TrackIt</div>
  <h1 style="margin:8px 0 18px;font-size:26px;letter-spacing:-0.6px">${esc(displayDate)}</h1>
  <div style="color:${muted};font-size:12px;font-weight:600;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid ${border}">
    ${stats.minutes} mins · <span style="color:${accent}">${stats.volume.toLocaleString()} ${esc(unit)}</span> · ${stats.exerciseCount} Exercises
  </div>
  ${cards}
</body>
</html>`;
}

export async function shareWorkoutDayPdf({ date, dayWorkouts, unit, colors, isDark }) {
  const stamp = date || format(new Date(), 'yyyy-MM-dd');
  const filename = `TrackIt-${stamp}.pdf`;
  const html = buildWorkoutDayHtml({ date, dayWorkouts, unit, colors, isDark });

  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } else {
      await RNShare.share({ message: `TrackIt workout · ${stamp}` });
    }
    return { ok: true };
  }

  const pdf = buildWorkoutDayPdfString({ date, dayWorkouts, unit, colors, isDark });
  let FileSystem;
  try {
    FileSystem = await import('expo-file-system/legacy');
  } catch {
    FileSystem = await import('expo-file-system');
  }
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const path = `${dir}${filename}`;
  try {
    if (FileSystem.deleteAsync) await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    /* dest may not exist */
  }
  await FileSystem.writeAsStringAsync(path, pdf);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share workout PDF',
    });
  } else {
    Alert.alert('Share', 'Sharing is not available on this device.');
  }
  return { ok: true, path };
}
