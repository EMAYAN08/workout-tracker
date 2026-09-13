import {
  mixHex,
  resolvePalette,
  ACCENT_SWATCHES,
  CHART_SWATCHES,
  DEFAULT_ACCENT_ID,
  DEFAULT_CHART_ID,
  palettes,
} from '../theme';

describe('ACCENT_SWATCHES', () => {
  test('has unique ids and hex pairs', () => {
    expect(ACCENT_SWATCHES.length).toBeGreaterThanOrEqual(16);
    const ids = ACCENT_SWATCHES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of ACCENT_SWATCHES) {
      expect(s).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          dark: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          light: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        })
      );
    }
  });

  test('default accent id exists', () => {
    expect(ACCENT_SWATCHES.some((s) => s.id === DEFAULT_ACCENT_ID)).toBe(true);
    expect(DEFAULT_ACCENT_ID).toBe('steel');
  });
});

describe('mixHex', () => {
  test('t=0 returns the first color, t=1 the second', () => {
    expect(mixHex('#000000', '#ffffff', 0).toLowerCase()).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1).toLowerCase()).toBe('#ffffff');
  });

  test('t=0.5 blends mid-grey', () => {
    expect(mixHex('#000000', '#ffffff', 0.5).toLowerCase()).toBe('#808080');
  });

  test('mixes channel-wise', () => {
    expect(mixHex('#4A7C9B', '#070707', 0).toLowerCase()).toBe('#4a7c9b');
    const mixed = mixHex('#ff0000', '#0000ff', 0.5).toLowerCase();
    expect(mixed).toBe('#800080');
  });

  test('clamps out-of-range t', () => {
    expect(mixHex('#000000', '#ffffff', 2).toLowerCase()).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', -1).toLowerCase()).toBe('#000000');
  });

  test('short / empty hex is treated as black', () => {
    expect(mixHex('#fff', '#000000', 0).toLowerCase()).toBe('#000000');
    expect(mixHex('', '#ffffff', 0).toLowerCase()).toBe('#000000');
  });
});

describe('resolvePalette', () => {
  test('dark scheme uses dark accent / chart colors', () => {
    const p = resolvePalette('dark', 'steel', 'olive');
    const steel = ACCENT_SWATCHES.find((s) => s.id === 'steel');
    const olive = CHART_SWATCHES.find((s) => s.id === 'olive');
    expect(p.background).toBe(palettes.dark.background);
    expect(p.accent).toBe(steel.dark);
    expect(p.primary).toBe(steel.dark);
    expect(p.blue).toBe(steel.dark);
    expect(p.indigo).toBe(steel.dark);
    expect(p.accentBorder).toBe(steel.dark);
    expect(p.chartAccent).toBe(olive.dark);
    expect(p.heatmapWork).toBe(olive.dark);
    expect(p.accentFg).toBe('#F4F4F2');
  });

  test('light scheme uses light accent / chart colors', () => {
    const p = resolvePalette('light', 'steel', 'olive');
    const steel = ACCENT_SWATCHES.find((s) => s.id === 'steel');
    const olive = CHART_SWATCHES.find((s) => s.id === 'olive');
    expect(p.background).toBe(palettes.light.background);
    expect(p.accent).toBe(steel.light);
    expect(p.chartAccent).toBe(olive.light);
    expect(p.text).toBe(palettes.light.text);
  });

  test('unknown scheme falls back to dark', () => {
    const p = resolvePalette('neon', 'steel', 'olive');
    expect(p.background).toBe(palettes.dark.background);
  });

  test('unknown accent / chart ids fall back to the first swatch', () => {
    const p = resolvePalette('dark', 'not-a-color', 'also-fake');
    expect(p.accent).toBe(ACCENT_SWATCHES[0].dark);
    expect(p.chartAccent).toBe(CHART_SWATCHES[0].dark);
  });

  test('defaults to dark / steel / olive', () => {
    const p = resolvePalette();
    expect(p.accent).toBe(ACCENT_SWATCHES.find((s) => s.id === DEFAULT_ACCENT_ID).dark);
    expect(p.chartAccent).toBe(CHART_SWATCHES.find((s) => s.id === DEFAULT_CHART_ID).dark);
  });

  test('builds derived heatmap / ring colors via mixHex', () => {
    const p = resolvePalette('dark', 'steel', 'olive');
    const olive = CHART_SWATCHES.find((s) => s.id === 'olive');
    expect(p.heatmapRest).toBe(mixHex(olive.dark, palettes.dark.background, 0.58));
    expect(p.chartRings).toHaveLength(5);
    expect(p.chartRings[4]).toBe(olive.dark);
    expect(p.accentSoftFill).toBe(mixHex(p.accent, palettes.dark.surface, 0.78));
  });

  test('light heatmapRest uses 0.5 mix', () => {
    const p = resolvePalette('light', 'steel', 'olive');
    const olive = CHART_SWATCHES.find((s) => s.id === 'olive');
    expect(p.heatmapRest).toBe(mixHex(olive.light, palettes.light.background, 0.5));
  });

  test('high-luminance accents get dark foreground', () => {
    const ice = resolvePalette('dark', 'ice', 'ivory');
    expect(ice.accentFg).toBe('#141414');
    expect(ice.chartFg).toBe('#141414');
  });
});
