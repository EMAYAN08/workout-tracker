import { EXERCISE_CATALOG, searchCatalog } from '../data/catalog';

describe('EXERCISE_CATALOG', () => {
  test('is a non-empty list of unique ids with muscle groups', () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThan(40);
    const ids = EXERCISE_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ex of EXERCISE_CATALOG) {
      expect(ex).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          muscleGroup: expect.any(String),
        })
      );
    }
  });

  test('covers the expected muscle groups', () => {
    const groups = new Set(EXERCISE_CATALOG.map((e) => e.muscleGroup));
    for (const g of ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other']) {
      expect(groups.has(g)).toBe(true);
    }
  });
});

describe('searchCatalog', () => {
  test('empty / whitespace query returns []', () => {
    expect(searchCatalog('')).toEqual([]);
    expect(searchCatalog('   ')).toEqual([]);
    expect(searchCatalog(null)).toEqual([]);
    expect(searchCatalog(undefined)).toEqual([]);
    expect(searchCatalog()).toEqual([]);
  });

  test('matches catalog by name (case-insensitive)', () => {
    const hits = searchCatalog('bench press');
    expect(hits.some((e) => e.id === 'ex_barbell_bench_press')).toBe(true);
    expect(hits.every((e) => e.name.toLowerCase().includes('bench press') || e.muscleGroup.includes('bench press'))).toBe(true);
  });

  test('matches catalog by muscle group', () => {
    const hits = searchCatalog('cardio');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.muscleGroup === 'cardio' || e.name.toLowerCase().includes('cardio'))).toBe(true);
  });

  test('custom exercises are returned before catalog hits', () => {
    const custom = [{ id: 'c1', name: 'Bench Press Machine', muscleGroup: 'chest' }];
    const hits = searchCatalog('bench', custom);
    expect(hits[0].id).toBe('c1');
    expect(hits.some((e) => e.id === 'ex_barbell_bench_press')).toBe(true);
  });

  test('custom name that collides with catalog wins (deduped by name)', () => {
    const custom = [{ id: 'c_custom_bench', name: 'Barbell Bench Press', muscleGroup: 'chest' }];
    const hits = searchCatalog('barbell bench press', custom);
    const benches = hits.filter((e) => e.name.toLowerCase() === 'barbell bench press');
    expect(benches).toHaveLength(1);
    expect(benches[0].id).toBe('c_custom_bench');
  });

  test('custom muscle-group hits are included', () => {
    const custom = [{ id: 'c_glute', name: 'Hip Airplane', muscleGroup: 'glutes-special' }];
    const hits = searchCatalog('glutes-special', custom);
    expect(hits.map((e) => e.id)).toEqual(['c_glute']);
  });

  test('caps results at 40 (custom first, then catalog)', () => {
    const custom = Array.from({ length: 15 }, (_, i) => ({
      id: `c_${i}`,
      name: `Zed Move ${i}`,
      muscleGroup: 'other',
    }));
    const hits = searchCatalog('e', custom);
    expect(hits.length).toBeLessThanOrEqual(40);
    expect(hits.length).toBe(40);
    expect(hits.slice(0, 15).every((e) => e.id.startsWith('c_'))).toBe(true);
  });

  test('does not mutate EXERCISE_CATALOG', () => {
    const before = EXERCISE_CATALOG.length;
    searchCatalog('press', [{ id: 'c', name: 'Press Thing', muscleGroup: 'chest' }]);
    expect(EXERCISE_CATALOG.length).toBe(before);
  });
});
