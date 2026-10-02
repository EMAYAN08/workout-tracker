import { titleCase, muscleTagColors, MUSCLE_TAG } from '../utils/format';

describe('titleCase', () => {
  test('empty / null / undefined returns empty string', () => {
    expect(titleCase('')).toBe('');
    expect(titleCase('   ')).toBe('');
    expect(titleCase(null)).toBe('');
    expect(titleCase(undefined)).toBe('');
  });

  test('splits on spaces, underscores, and hyphens', () => {
    expect(titleCase('hello_world')).toBe('Hello World');
    expect(titleCase('hello-world')).toBe('Hello World');
    expect(titleCase('bench press')).toBe('Bench Press');
    expect(titleCase('front_foot-elevated split')).toBe('Front Foot Elevated Split');
  });

  test('normalizes ALLCAPS and mixed case', () => {
    expect(titleCase('HELLO')).toBe('Hello');
    expect(titleCase('bEnCh')).toBe('Bench');
  });

  test('trims surrounding whitespace', () => {
    expect(titleCase('  squat  ')).toBe('Squat');
  });

  test('coerces numbers', () => {
    expect(titleCase(12)).toBe('12');
  });
});

describe('muscleTagColors', () => {
  const groups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];

  test.each(groups)('%s dark palette', (group) => {
    expect(muscleTagColors(group, true)).toEqual(MUSCLE_TAG[group].dark);
  });

  test.each(groups)('%s light palette', (group) => {
    expect(muscleTagColors(group, false)).toEqual(MUSCLE_TAG[group].light);
  });

  test('isDark defaults to true', () => {
    expect(muscleTagColors('chest')).toEqual(MUSCLE_TAG.chest.dark);
  });

  test('unknown groups fall back to other', () => {
    expect(muscleTagColors('glutes', true)).toEqual(MUSCLE_TAG.other.dark);
    expect(muscleTagColors('glutes', false)).toEqual(MUSCLE_TAG.other.light);
    expect(muscleTagColors('not-a-muscle')).toEqual(MUSCLE_TAG.other.dark);
  });

  test('null / undefined group uses other', () => {
    expect(muscleTagColors(null, true)).toEqual(MUSCLE_TAG.other.dark);
    expect(muscleTagColors(undefined, false)).toEqual(MUSCLE_TAG.other.light);
  });

  test('mixed-case group names match', () => {
    expect(muscleTagColors('Chest', true)).toEqual(MUSCLE_TAG.chest.dark);
    expect(muscleTagColors('LEGS', false)).toEqual(MUSCLE_TAG.legs.light);
  });

  test('each swatch has bg and fg hex', () => {
    for (const group of groups) {
      const dark = muscleTagColors(group, true);
      const light = muscleTagColors(group, false);
      expect(dark.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(dark.fg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(light.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(light.fg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
