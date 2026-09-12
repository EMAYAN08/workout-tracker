export const ACCENT_SWATCHES = [
  { id: 'steel', label: 'Steel', dark: '#4A7C9B', light: '#2F5C7A' },
  { id: 'navy', label: 'Navy', dark: '#3E5F8A', light: '#2A466C' },
  { id: 'cobalt', label: 'Cobalt', dark: '#3A6EA8', light: '#24548A' },
  { id: 'slate', label: 'Slate', dark: '#6A7B8C', light: '#4A5B6C' },
  { id: 'ink', label: 'Ink', dark: '#5A6E8A', light: '#3A4E6A' },
  { id: 'glacier', label: 'Glacier', dark: '#6A8A9A', light: '#4A6A7A' },
];

export const CHART_SWATCHES = [
  { id: 'olive', label: 'Olive', dark: '#9AAA78', light: '#6E7C4E' },
  { id: 'sage', label: 'Sage', dark: '#86A48C', light: '#5C7A62' },
  { id: 'moss', label: 'Moss', dark: '#7A946C', light: '#54704A' },
  { id: 'sand', label: 'Sand', dark: '#C4A878', light: '#8A7048' },
  { id: 'clay', label: 'Clay', dark: '#B08A78', light: '#7A5C4E' },
  { id: 'mist', label: 'Mist', dark: '#8A9A9A', light: '#5A6A6A' },
];

export const DEFAULT_ACCENT_ID = 'steel';
export const DEFAULT_CHART_ID = 'olive';

function hexLum(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export function resolvePalette(scheme = 'dark', accentId = DEFAULT_ACCENT_ID, chartId = DEFAULT_CHART_ID) {
  const base = palettes[scheme] || palettes.dark;
  const acc = ACCENT_SWATCHES.find((s) => s.id === accentId) || ACCENT_SWATCHES[0];
  const ch = CHART_SWATCHES.find((s) => s.id === chartId) || CHART_SWATCHES[0];
  const accent = scheme === 'light' ? acc.light : acc.dark;
  const chartAccent = scheme === 'light' ? ch.light : ch.dark;
  const accentFg = hexLum(accent) > 0.62 ? '#141414' : '#F4F4F2';
  const chartFg = hexLum(chartAccent) > 0.62 ? '#141414' : '#F4F4F2';
  const bg = base.background;
  const restMix = scheme === 'dark' ? 0.58 : 0.5;
  return {
    ...base,
    accent,
    accentBorder: accent,
    primary: accent,
    primaryLight: accent,
    blue: accent,
    indigo: accent,
    accentFg,
    chartAccent,
    chartFg,
    heatmapWork: chartAccent,
    heatmapRest: mixHex(chartAccent, bg, restMix),
    chartRings: [
      mixHex(chartAccent, bg, 0.78),
      mixHex(chartAccent, bg, 0.6),
      mixHex(chartAccent, bg, 0.42),
      mixHex(chartAccent, bg, 0.24),
      chartAccent,
    ],
  };
}

const accent = {
  dark: '#4A7C9B',
  light: '#2F5C7A',
};

export const palettes = {
  light: {
    background: '#F2F1EE',
    surface: '#FFFFFF',
    surface2: '#EBEAE6',
    surface3: '#E2E0DB',
    surfaceLight: '#EBEAE6',
    text: '#141414',
    textMuted: '#5C5C5C',
    textSubtle: '#8A8A8A',
    border: '#D4D2CD',
    borderStrong: '#B8B6B1',
    accent: accent.light,
    accentSoft: 'transparent',
    accentBorder: accent.light,
    accentFg: '#FFFFFF',
    primary: accent.light,
    primaryLight: accent.light,
    danger: '#A33B36',
    dangerSoft: 'transparent',
    overlay: 'rgba(20,20,20,0.45)',
    glass: '#FFFFFF',
    nav: '#F2F1EE',
    shadow: 'transparent',
    heatmapEmpty: '#E2E0DB',
    heatmapRest: '#C4C2BC',
    heatmapWork: '#2A2A2A',
    heatmapFuture: '#D8D6D1',
    chartGrid: '#D4D2CD',
    chartEmpty: '#EBEAE6',
    chartFill: 'transparent',
    chartAxis: '#8A8A8A',
    chartDotStroke: '#FFFFFF',
    chartAccent: '#6E7C4E',
    amber: '#5C5C5C',
    orange: '#5C5C5C',
    yellow: '#5C5C5C',
    blue: accent.light,
    indigo: accent.light,
    emerald: '#5C5C5C',
    red: '#A33B36',
    success: '#141414',
    successSoft: 'transparent',
    glow: 'transparent',
  },
  dark: {
    background: '#070707',
    surface: '#111111',
    surface2: '#181818',
    surface3: '#222222',
    surfaceLight: '#181818',
    text: '#F4F4F2',
    textMuted: '#9A9A96',
    textSubtle: '#6A6A66',
    border: '#2A2A2A',
    borderStrong: '#3D3D3D',
    accent: accent.dark,
    accentSoft: 'transparent',
    accentBorder: accent.dark,
    accentFg: '#F4F4F2',
    primary: accent.dark,
    primaryLight: accent.dark,
    danger: '#C45C55',
    dangerSoft: 'transparent',
    overlay: 'rgba(0,0,0,0.72)',
    glass: '#111111',
    nav: '#0C0C0C',
    shadow: 'transparent',
    heatmapEmpty: '#1C1C1C',
    heatmapRest: '#3A3A3A',
    heatmapWork: '#C8C4C0',
    heatmapFuture: '#070707',
    chartGrid: '#2A2A2A',
    chartEmpty: '#181818',
    chartFill: 'transparent',
    chartAxis: '#6A6A66',
    chartDotStroke: '#070707',
    chartAccent: '#9AAA78',
    amber: '#9A9A96',
    orange: '#9A9A96',
    yellow: '#9A9A96',
    blue: accent.dark,
    indigo: accent.dark,
    emerald: '#9A9A96',
    red: '#C45C55',
    success: '#F4F4F2',
    successSoft: 'transparent',
    glow: 'transparent',
  },
};

export const colors = palettes.dark;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 8,
  xxl: 8,
  full: 999,
};

export const type = {
  largeTitle: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, letterSpacing: -0.3, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.3, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, letterSpacing: -0.2, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 22, letterSpacing: -0.2, fontWeight: '500' },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: 0, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0.1, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: '500' },
};

export const fonts = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
  extrabold: 'IBMPlexSans_700Bold',
  black: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_700Bold',
};

export const HIT = 44;

export const muscleTones = {
  light: {
    chest: '#141414',
    back: '#3A3A3A',
    legs: '#5C5C5C',
    shoulders: '#3A3A3A',
    core: '#141414',
    arms: '#8A8A8A',
  },
  dark: {
    chest: '#F4F4F2',
    back: '#C8C4C0',
    legs: '#9A9A96',
    shoulders: '#C8C4C0',
    core: '#F4F4F2',
    arms: '#6A6A66',
  },
};
