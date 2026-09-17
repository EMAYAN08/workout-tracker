import { buildWorkoutDayHtml, buildWorkoutDayPdfString, dayWorkoutStats, esc } from '../utils/workoutDayPdf';

const colors = {
  background: '#070707',
  surface: '#111111',
  surface2: '#181818',
  surfaceLight: '#181818',
  text: '#F4F4F2',
  textMuted: '#9A9A96',
  textSubtle: '#6A6A66',
  border: '#2A2A2A',
  chartAccent: '#9AAA78',
};

describe('workout day PDF html', () => {
  test('escapes html in names', () => {
    expect(esc('<')).toBe(String.fromCharCode(38) + 'lt;');
    expect(esc('&')).toBe(String.fromCharCode(38) + 'amp;');
    expect(esc('"')).toBe(String.fromCharCode(38) + 'quot;');
  });

  test('stats convert volume to the display unit', () => {
    const stats = dayWorkoutStats(
      [
        {
          duration: 3600,
          unitSaved: 'lbs',
          exercises: [{ sets: [{ weight: 100, reps: 10 }] }],
        },
      ],
      'lbs'
    );
    expect(stats.minutes).toBe(60);
    expect(stats.volume).toBe(1000);
    expect(stats.exerciseCount).toBe(1);
  });

  test('includes date, routine, sets, and rest-day copy', () => {
    const html = buildWorkoutDayHtml({
      date: '2026-03-12',
      unit: 'lbs',
      colors,
      isDark: true,
      dayWorkouts: [
        {
          routineName: 'Push Day',
          startTime: '2026-03-12T14:00:00.000Z',
          unitSaved: 'lbs',
          duration: 2400,
          exercises: [
            {
              name: 'Bench Press',
              muscleGroup: 'chest',
              sets: [
                { weight: 185, reps: 5 },
                { weight: 175, reps: 8 },
              ],
            },
          ],
        },
        {
          routineName: 'Off',
          startTime: '2026-03-12T20:00:00.000Z',
          exercises: [],
          duration: 0,
        },
      ],
    });
    expect(html).toContain('TrackHit');
    expect(html).toContain('Push Day');
    expect(html).toContain('Bench Press');
    expect(html).toContain('Chest');
    expect(html).toContain('185');
    expect(html).toContain('Rest Day');
    expect(html).toContain('Active Recovery Logged');
    expect(html).toContain('print-color-adjust: exact');
    expect(html).not.toContain('<script');
  });

  test('builds a valid PDF with the workout on it', () => {
    const pdf = buildWorkoutDayPdfString({
      date: '2026-03-12',
      unit: 'lbs',
      colors,
      isDark: true,
      dayWorkouts: [
        {
          routineName: 'Push Day',
          startTime: '2026-03-12T14:00:00.000Z',
          unitSaved: 'lbs',
          exercises: [{ name: 'Bench Press', muscleGroup: 'chest', sets: [{ weight: 185, reps: 5 }] }],
        },
      ],
    });
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(pdf).toContain('Push Day');
    expect(pdf).toContain('Bench Press');
    expect(pdf).toContain('/Helvetica-Bold');
  });
});
