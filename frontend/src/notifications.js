import { Platform } from 'react-native';

const LIVE_ID = 'trackitRestLive';
const DONE_ID = 'trackitRestDone';
const CH_LIVE = 'rest-live';
const CH_DONE = 'rest-done';

let Notifications = null;
let lastLiveKey = '';

async function mod() {
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    if (Platform.OS !== 'web') {
      Notifications.setNotificationHandler({
        handleNotification: async (n) => {
          const done = n?.request?.identifier === DONE_ID || n?.request?.content?.data?.kind === 'restDone';
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: !!done,
            shouldSetBadge: false,
          };
        },
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
      await N.setNotificationChannelAsync(CH_LIVE, {
        name: 'Rest timer',
        importance: N.AndroidImportance?.DEFAULT ?? 3,
        enableVibrate: false,
        sound: null,
        lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
      });
      await N.setNotificationChannelAsync(CH_DONE, {
        name: 'Rest complete',
        importance: N.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 220, 120, 220],
        lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
        sound: 'default',
      });
    }
  } catch (err) {
    console.warn('notification channels', err?.message || err);
  }
}

async function presentLive(content) {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  await N.scheduleNotificationAsync({
    identifier: LIVE_ID,
    content: {
      ...content,
      sound: false,
      sticky: true,
      autoDismiss: false,
      channelId: CH_LIVE,
      priority: N.AndroidNotificationPriority?.DEFAULT,
      interruptionLevel: 'passive',
      data: { kind: 'restLive' },
    },
    trigger: null,
  });
}

export async function tickRestNotification({ remainingSec, totalSec, exerciseName, setLabel } = {}) {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  const remaining = Math.max(0, Math.floor(Number(remainingSec) || 0));
  const total = Math.max(remaining, Math.floor(Number(totalSec) || remaining) || 1);
  const name = exerciseName || 'TrackIt';
  const set = setLabel || 'Next set';
  const clock = formatRestClock(remaining);
  const key = `${name}|${set}|${clock}`;
  if (key === lastLiveKey) return;
  lastLiveKey = key;
  try {
    await presentLive({
      title: `${clock} rest`,
      subtitle: name,
      body: `${name} · ${set}`,
      android: {
        channelId: CH_LIVE,
        ongoing: true,
        sticky: true,
        visibility: N.AndroidNotificationVisibility?.PUBLIC,
        progress: {
          max: total,
          current: remaining,
          indeterminate: false,
        },
      },
    });
  } catch (err) {
    console.warn('live rest tick', err?.message || err);
  }
}

export async function scheduleRestNotification({
  seconds,
  exerciseName,
  setLabel,
} = {}) {
  const N = await mod();
  const remaining = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!N || Platform.OS === 'web') return;
  try {
    await cancelRestNotification();
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    await registerNotificationCategories();
    await tickRestNotification({ remainingSec: remaining, totalSec: remaining, exerciseName, setLabel });
    if (remaining > 0) {
      await N.scheduleNotificationAsync({
        identifier: DONE_ID,
        content: {
          title: 'Rest is over',
          subtitle: exerciseName || 'TrackIt',
          body: `${setLabel || 'Next set'} · ${exerciseName || 'TrackIt'}`,
          sound: true,
          channelId: CH_DONE,
          interruptionLevel: 'timeSensitive',
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

export async function dismissLiveRest() {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  lastLiveKey = '';
  try {
    await N.cancelScheduledNotificationAsync(LIVE_ID).catch(() => {});
    await N.dismissNotificationAsync(LIVE_ID).catch(() => {});
  } catch {
    /* noop */
  }
}

export async function cancelRestNotification() {
  const N = await mod();
  lastLiveKey = '';
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
