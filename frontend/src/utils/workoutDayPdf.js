import { Platform, Share as RNShare, Alert } from 'react-native';
import { format, parseISO } from 'date-fns';
import { convertWeight, calculateVolume } from './calculations';
import { titleCase, muscleTagColors } from './format';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
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
    html, body {
      margin: 0;
      padding: 0;
      background: ${bg};
      color: ${text};
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
    }
    body { padding: 36px 32px 44px; }
    .brand {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }
    .logo {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: ${subtle};
      font-weight: 600;
    }
    h1 {
      margin: 0 0 18px;
      font-size: 26px;
      letter-spacing: -0.6px;
      font-weight: 700;
      line-height: 1.15;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      margin-bottom: 22px;
      padding-bottom: 16px;
      border-bottom: 1px solid ${border};
    }
    .meta-item { color: ${muted}; font-size: 12px; font-weight: 600; }
    .meta-item strong { color: ${accent}; font-weight: 700; }
    .card {
      background: ${surface};
      border: 1px solid ${border};
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .card-head {
      background: ${surfaceLight};
      padding: 14px 16px;
      border-bottom: 1px solid ${border};
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .card-title { font-size: 15px; font-weight: 700; }
    .card-time { font-size: 11px; font-weight: 700; color: ${muted}; text-transform: uppercase; letter-spacing: 0.6px; }
    .card-body { padding: 16px; }
    .rest { padding: 28px 18px; text-align: center; background: ${surface2}; }
    .rest-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .rest-sub { font-size: 13px; color: ${muted}; line-height: 1.4; }
    .ex { margin-bottom: 18px; }
    .ex:last-child { margin-bottom: 0; }
    .ex-name { font-size: 15px; font-weight: 700; text-transform: capitalize; margin-bottom: 6px; }
    .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      background: ${surfaceLight};
      border: 1px solid ${border};
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      font-size: 11px;
      font-weight: 700;
      color: ${muted};
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: center;
      padding: 10px 8px 6px;
    }
    td {
      font-size: 14px;
      font-weight: 700;
      text-align: center;
      padding: 8px;
      border-top: 1px solid ${border};
    }
    th.num, td.num { width: 56px; text-align: left; padding-left: 14px; }
    td.muted { color: ${muted}; }
    td.accent { color: ${accent}; }
    .unit { color: ${muted}; font-size: 11px; font-weight: 500; }
    .foot {
      margin-top: 8px;
      text-align: center;
      color: ${subtle};
      font-size: 11px;
      letter-spacing: 0.4px;
    }
  </style>
</head>
<body>
  <div class="brand">
    <div class="logo">TrackIt</div>
    <div class="logo">${esc(unit)}</div>
  </div>
  <h1>${esc(displayDate)}</h1>
  <div class="meta">
    <div class="meta-item">${stats.minutes} mins</div>
    <div class="meta-item"><strong>${stats.volume.toLocaleString()} ${esc(unit)}</strong></div>
    <div class="meta-item">${stats.exerciseCount} Exercises</div>
  </div>
  ${cards}
  <div class="foot">Logged on this device · TrackIt</div>
</body>
</html>`;
}

export async function shareWorkoutDayPdf({ date, dayWorkouts, unit, colors, isDark }) {
  const html = buildWorkoutDayHtml({ date, dayWorkouts, unit, colors, isDark });
  const stamp = date || format(new Date(), 'yyyy-MM-dd');
  const filename = `TrackIt-${stamp}.pdf`;

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

  const Print = await import('expo-print');
  const { uri } = await Print.printToFileAsync({ html });
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
  try {
    await FileSystem.copyAsync({ from: uri, to: path });
  } catch {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share workout PDF',
    });
    return { ok: true, path: uri };
  }
  const Sharing = await import('expo-sharing');
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
