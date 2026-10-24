import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { buildWidgetSnapshot, syncWidgetSnapshot, resetWidgetCache } from './widgetSnapshot';

export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/**
 * Keep the home screen consistency widget in sync: on launch (after hydration),
 * whenever workout history or theme colours change (log/edit/delete), on
 * foreground, and at local midnight while the app is open.
 */
export default function useWidgetSync({ hydrated, workoutHistory, colors }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hydrated) return undefined;
    syncWidgetSnapshot(buildWidgetSnapshot({ workoutHistory, colors, now: new Date() }));
    const t = setTimeout(() => setTick((n) => n + 1), msUntilNextMidnight() + 1000);
    return () => clearTimeout(t);
  }, [hydrated, workoutHistory, colors, tick]);

  useEffect(() => {
    if (!hydrated) return undefined;
    const sub = AppState.addEventListener?.('change', (st) => {
      if (st === 'active') {
        resetWidgetCache();
        setTick((n) => n + 1);
      }
    });
    return () => sub?.remove?.();
  }, [hydrated]);
}
