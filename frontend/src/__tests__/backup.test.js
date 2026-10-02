import { Alert } from 'react-native';
import { confirmImportMode } from '../db/backup';
import { buildBackup, parseBackup } from '../db/schema';

describe('confirmImportMode (iOS Alert)', () => {
  afterEach(() => {
    Alert.alert.mockReset();
  });

  test('Cancel resolves null', async () => {
    Alert.alert.mockImplementation((_t, _m, buttons) => {
      buttons.find((b) => b.text === 'Cancel').onPress();
    });
    await expect(confirmImportMode()).resolves.toBeNull();
  });

  test('Merge resolves merge', async () => {
    Alert.alert.mockImplementation((_t, _m, buttons) => {
      buttons.find((b) => b.text === 'Merge').onPress();
    });
    await expect(confirmImportMode()).resolves.toBe('merge');
  });

  test('Replace all resolves replace', async () => {
    Alert.alert.mockImplementation((_t, _m, buttons) => {
      buttons.find((b) => b.text === 'Replace all').onPress();
    });
    await expect(confirmImportMode()).resolves.toBe('replace');
  });
});

describe('backup envelope round-trip', () => {
  test('buildBackup then parseBackup preserves workouts', () => {
    const snap = buildBackup({
      workouts: [{ id: 'wk1', timestamp: '2026-01-01T00:00:00.000Z', exercises: [] }],
      routines: [{ id: 'rt1', name: 'Push', exercises: [] }],
      customExercises: [],
      unit: 'kgs',
      restTargetSec: 75,
    });
    const parsed = parseBackup(JSON.stringify(snap));
    expect(parsed.workouts[0].id).toBe('wk1');
    expect(parsed.routines[0].name).toBe('Push');
    expect(parsed.unit).toBe('kgs');
    expect(parsed.restTargetSec).toBe(75);
  });
});
