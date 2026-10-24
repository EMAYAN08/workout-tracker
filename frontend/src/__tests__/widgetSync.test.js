import fs from 'fs';
import path from 'path';

const effects = [];
const listeners = [];
jest.mock('react', () => ({
  useState: (v) => [v, jest.fn()],
  useEffect: (fn) => { effects.push(fn); },
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: (ev, cb) => { listeners.push(cb); return { remove: jest.fn() }; } },
}));

const useWidgetSync = require('../useWidgetSync').default;
const ws = require('../widgetSnapshot');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

beforeEach(() => { effects.length = 0; listeners.length = 0; jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); ws.__setWidgetNativeForTests(undefined); });

const hist = [{ timestamp: new Date().toISOString(), exercises: [{ name: 'Bench' }] }];

test('does nothing before hydration', () => {
  const n = { setWidgetData: jest.fn() };
  ws.__setWidgetNativeForTests(n);
  useWidgetSync({ hydrated: false, workoutHistory: hist, colors: {} });
  effects.forEach((f) => f());
  expect(n.setWidgetData).not.toHaveBeenCalled();
  expect(listeners).toHaveLength(0);
});

test('writes snapshot after hydration and re-writes on foreground', () => {
  const n = { setWidgetData: jest.fn() };
  ws.__setWidgetNativeForTests(n);
  useWidgetSync({ hydrated: true, workoutHistory: hist, colors: {} });
  effects.forEach((f) => f());
  expect(n.setWidgetData).toHaveBeenCalledTimes(1);
  const snap = JSON.parse(n.setWidgetData.mock.calls[0][0]);
  expect(snap.hasData).toBe(true);
  expect(snap.days.slice(-1)).toBe('1');
  // foreground resets dedupe so the next sync writes again
  listeners.forEach((cb) => cb('active'));
  effects[0]();
  expect(n.setWidgetData).toHaveBeenCalledTimes(2);
});

test('history change (log/edit/delete) pushes a new snapshot', () => {
  const n = { setWidgetData: jest.fn() };
  ws.__setWidgetNativeForTests(n);
  useWidgetSync({ hydrated: true, workoutHistory: hist, colors: {} });
  effects[0]();
  effects.length = 0;
  useWidgetSync({ hydrated: true, workoutHistory: [], colors: {} });
  effects[0]();
  expect(n.setWidgetData).toHaveBeenCalledTimes(2);
  expect(JSON.parse(n.setWidgetData.mock.calls[1][0]).hasData).toBe(false);
});

test('AppContent mounts the sync hook', () => {
  const src = read('src/AppContent.jsx');
  expect(src).toMatch(/useWidgetSync\(\{ hydrated, workoutHistory, colors \}\)/);
});

test('native module, widget and JS agree on kind, key and app group', () => {
  const mod = read('modules/trackhit-live-activity/ios/TrackHitLiveActivityModule.swift');
  const w = read('targets/widget/TrackHitConsistencyWidget.swift');
  const bundle = read('targets/widget/TrackHitLiveActivity.swift');
  expect(mod).toContain(`"${ws.WIDGET_KIND}"`);
  expect(w).toContain(`"${ws.WIDGET_KIND}"`);
  expect(mod).toContain('"trackhit.widget.consistency"');
  expect(w).toContain('"trackhit.widget.consistency"');
  expect(w).toContain('"group.com.trackhit.app"');
  expect(mod).toMatch(/Function\("setWidgetData"\)/);
  expect(bundle).toContain('TrackHitConsistencyWidget()');
  // Swift decoder needs every snapshot key
  const snap = ws.buildWidgetSnapshot({ workoutHistory: [] });
  Object.keys(snap).forEach((k) => expect(w).toMatch(new RegExp(`var ${k}:`)));
  Object.keys(snap.colors).forEach((k) => expect(w).toMatch(new RegExp(`var ${k}:`)));
});
