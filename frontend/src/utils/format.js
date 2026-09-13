export function titleCase(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  return s
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const MUSCLE_TAG = {
  chest: { dark: { bg: '#3D5A80', fg: '#E8F1FF' }, light: { bg: '#D6E4F5', fg: '#1E3A5F' } },
  back: { dark: { bg: '#3D6B54', fg: '#E3F6EA' }, light: { bg: '#D4EEDC', fg: '#1F4A32' } },
  legs: { dark: { bg: '#5A4A78', fg: '#EDE4FF' }, light: { bg: '#E6DCF5', fg: '#3A2A58' } },
  shoulders: { dark: { bg: '#6A5340', fg: '#F6E6D8' }, light: { bg: '#F3E0D0', fg: '#4A3220' } },
  arms: { dark: { bg: '#6A4048', fg: '#F8DEE2' }, light: { bg: '#F3D6DC', fg: '#5A2028' } },
  core: { dark: { bg: '#4A5A3A', fg: '#E8F2D8' }, light: { bg: '#E0ECCA', fg: '#2E3C18' } },
  cardio: { dark: { bg: '#3A5C6A', fg: '#D8F0F6' }, light: { bg: '#D0E8F0', fg: '#1C3C48' } },
  other: { dark: { bg: '#4A4A4A', fg: '#E8E8E8' }, light: { bg: '#E2E0DB', fg: '#2A2A2A' } },
};

export function muscleTagColors(group, isDark = true) {
  const key = String(group || 'other').toLowerCase();
  const found = MUSCLE_TAG[key] || MUSCLE_TAG.other;
  return isDark ? found.dark : found.light;
}
