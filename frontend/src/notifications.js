import { Platform } from 'react-native';

export const CAT_REST_RUN = 'restRun';
export const CAT_REST_PAUSE = 'restPause';
export const CAT_REST_DONE = 'restDone';
export const ACT_START = 'startSet';
export const ACT_PAUSE = 'pauseRest';
export const ACT_RESUME = 'resumeRest';

const LIVE_ID = 'trackitRestLive';
const DONE_ID = 'trackitRestDone';

let Notifications = null;
let responseSub = null;

async function mod() {
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    if (Platform.OS !== 'web') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
  } catch {
    Notifications = null;
  }
  return Notifications;
}

export function formatRestClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export async function ensureNotificationPermission() {
  const N = await mod();
  if (!N || Platform.OS === 'web') return false;
  const existing = await N.getPermissionsAsync();
  if (existing.granted || existing.iosStatus === N.IosAuthorizationStatus?.PROVISIONAL) return true;
  const asked = await N.requestPermissionsAsync();
  return asked.granted || asked.iosStatus === N.IosAuthorizationStatus?.PROVISIONAL;
}

export async function registerNotificationCategories() {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android' && N.setNotificationChannelAsync) {
      await N.setNotificationChannelAsync('rest', {
        name: 'Rest timer',
        importance: N.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 220, 120, 220],
        lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
        sound: 'default',
      });
    }
    await N.setNotificationCategoryAsync(CAT_REST_RUN, [
      { identifier: ACT_PAUSE, buttonTitle: 'Pause', options: { opensAppToForeground: false } },
      { identifier: ACT_START, buttonTitle: 'Start Set', options: { opensAppToForeground: true } },
    ]);
    await N.setNotificationCategoryAsync(CAT_REST_PAUSE, [
      { identifier: ACT_RESUME, buttonTitle: 'Resume', options: { opensAppToForeground: false } },
      { identifier: ACT_START, buttonTitle: 'Start Set', options: { opensAppToForeground: true } },
    ]);
    await N.setNotificationCategoryAsync(CAT_REST_DONE, [
      { identifier: ACT_START, buttonTitle: 'Start Set', options: { opensAppToForeground: true } },
    ]);
  } catch (err) {
    console.warn('notification categories', err?.message || err);
  }
}

function payload({ exerciseName, setLabel, remainingSec, paused }) {
  const name = exerciseName || 'TrackIt';
  const set = setLabel || 'Next set';
  if (paused) {
    return {
      title: name,
      subtitle: set,
      body: `Paused · ${formatRestClock(remainingSec)} left · Resume or start the next set`,
      categoryIdentifier: CAT_REST_PAUSE,
    };
  }
  return {
    title: name,
    subtitle: set,
    body: `Rest ${formatRestClock(remainingSec)} · ${set}`,
    categoryIdentifier: CAT_REST_RUN,
  };
}

async function presentNow(identifier, content) {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  await N.scheduleNotificationAsync({
    identifier,
    content: {
      ...content,
      sound: false,
      sticky: true,
      autoDismiss: false,
      data: { kind: 'rest' },
    },
    trigger: null,
  });
}

export async function scheduleRestNotification({
  seconds,
  exerciseName,
  setLabel,
  paused = false,
} = {}) {
  const N = await mod();
  const remaining = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!N || Platform.OS === 'web') return;
  try {
    await cancelRestNotification();
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    const live = payload({ exerciseName, setLabel, remainingSec: remaining, paused });
    await presentNow(LIVE_ID, live);
    if (!paused && remaining > 0) {
      await N.scheduleNotificationAsync({
        identifier: DONE_ID,
        content: {
          title: exerciseName || 'TrackIt',
          subtitle: setLabel || 'Next set',
          body: `Rest is over · ${setLabel || 'Next set'}. Start the next set.`,
          sound: true,
          interruptionLevel: 'timeSensitive',
          categoryIdentifier: CAT_REST_DONE,
          data: { kind: 'restDone', exerciseName, setLabel },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval',
          seconds: Math.max(1, remaining),
          repeats: false,
        },
      });
    }
  } catch (err) {
    console.warn('rest notification failed', err?.message || err);
  }
}

export async function cancelRestNotification() {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  try {
    await N.cancelScheduledNotificationAsync(LIVE_ID).catch(() => {});
    await N.cancelScheduledNotificationAsync(DONE_ID).catch(() => {});
    await N.dismissNotificationAsync(LIVE_ID).catch(() => {});
    await N.dismissNotificationAsync(DONE_ID).catch(() => {});
  } catch {
    /* noop */
  }
}

export function subscribeNotificationActions(onAction) {
  let unsub = () => {};
  (async () => {
    const N = await mod();
    if (!N || Platform.OS === 'web') return;
    await registerNotificationCategories();
    if (responseSub) {
      responseSub.remove();
      responseSub = null;
    }
    responseSub = N.addNotificationResponseReceivedListener((response) => {
      const id = response?.actionIdentifier;
      if (!id || id === N.DEFAULT_ACTION_IDENTIFIER) return;
      onAction?.(id);
    });
    unsub = () => {
      responseSub?.remove();
      responseSub = null;
    };
  })();
  return () => unsub();
}

export function findNextIncompleteSet(workout) {
  if (!workout?.exercises) return null;
  for (let ei = 0; ei < workout.exercises.length; ei++) {
    const ex = workout.exercises[ei];
    const sets = ex.sets || [];
    for (let si = 0; si < sets.length; si++) {
      if (!sets[si].completedAt) {
        return {
          exerciseIndex: ei,
          setIndex: si,
          name: ex.name || 'Exercise',
          setNumber: si + 1,
          setLabel: `Set ${si + 1}`,
        };
      }
    }
  }
  return null;
}
