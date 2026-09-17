import { Platform } from 'react-native';

const LIVE_ID = 'trackitRestLive';
const DONE_ID = 'trackitRestDone';
const CH_LIVE = 'rest-live';
const CH_DONE = 'rest-done';

let Notifications = null;
let lastLiveKey = '';
let logoAttachment = null;
let donePresented = false;
let listenerAttached = false;
let liveTicksDisabled = false;
let scheduleWarned = false;

function warnOnce(label, err) {
  if (scheduleWarned) return;
  scheduleWarned = true;
  console.warn(label, err?.message || err);
}

function doneTrigger(N, seconds) {
  const wait = Math.max(1, Math.floor(Number(seconds) || 1));
  const dateType = N.SchedulableTriggerInputTypes?.DATE;
  if (dateType) {
    return { type: dateType, date: new Date(Date.now() + wait * 1000), repeats: false };
  }
  const intervalType = N.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval';
  return { type: intervalType, seconds: wait, repeats: false };
}

async function scheduleNow(N, { identifier, content, trigger }) {
  const payload = { identifier, content, trigger };
  try {
    await N.scheduleNotificationAsync(payload);
    return true;
  } catch (err) {
    if (content?.attachments) {
      const { attachments, ...rest } = content;
      try {
        await N.scheduleNotificationAsync({ identifier, content: rest, trigger });
        return true;
      } catch (retryErr) {
        warnOnce('notification schedule', retryErr);
        return false;
      }
    }
    warnOnce('notification schedule', err);
    return false;
  }
}

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
      if (!listenerAttached) {
        listenerAttached = true;
        Notifications.addNotificationReceivedListener((n) => {
          if (n?.request?.identifier === DONE_ID || n?.request?.content?.data?.kind === 'restDone') {
            donePresented = true;
          }
        });
      }
    }
  } catch {
    Notifications = null;
  }
  return Notifications;
}

async function getLogoAttachment() {
  if (logoAttachment) return logoAttachment;
  if (Platform.OS === 'web') return null;
  try {
    const { Asset } = await import('expo-asset');
    let FileSystem;
    try {
      FileSystem = await import('expo-file-system/legacy');
    } catch {
      FileSystem = await import('expo-file-system');
    }
    const asset = Asset.fromModule(require('../assets/icon.png'));
    await asset.downloadAsync();
    const src = asset.localUri || asset.uri;
    if (!src) return null;
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const dest = `${dir}trackit-notification-logo.png`;
    try {
      await FileSystem.copyAsync({ from: src, to: dest });
    } catch {
      /* already copied */
    }
    logoAttachment = {
      identifier: 'trackit-logo',
      url: dest,
      type: 'image/png',
      typeHint: 'public.png',
      hideThumbnail: false,
    };
    return logoAttachment;
  } catch (err) {
    console.warn('notification logo', err?.message || err);
    return null;
  }
}

export function formatRestClock(sec) {
  let s = Math.floor(Number(sec));
  if (!Number.isFinite(s) || s < 0) s = 0;
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
  if (Platform.OS === 'ios') return;
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  const logo = await getLogoAttachment();
  await scheduleNow(N, {
    identifier: LIVE_ID,
    content: {
      ...content,
      sound: false,
      sticky: true,
      autoDismiss: false,
      channelId: CH_LIVE,
      priority: N.AndroidNotificationPriority?.DEFAULT,
      data: { kind: 'restLive' },
      ...(logo ? { attachments: [logo] } : {}),
    },
    trigger: null,
  });
}

export async function tickRestNotification({ remainingSec, totalSec, exerciseName, setLabel } = {}) {
  if (Platform.OS === 'ios' || liveTicksDisabled) return;
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  const remaining = Math.max(0, Math.floor(Number(remainingSec) || 0));
  const total = Math.max(remaining, Math.floor(Number(totalSec) || remaining) || 1);
  const name = exerciseName || 'TrackHit';
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
    liveTicksDisabled = true;
    warnOnce('live rest tick', err);
  }
}

export async function scheduleRestNotification({
  seconds,
  exerciseName,
  setLabel,
  scheduleDone = true,
} = {}) {
  const N = await mod();
  const remaining = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!N || Platform.OS === 'web') return;
  try {
    await cancelRestNotification();
    donePresented = false;
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    await registerNotificationCategories();
    if (Platform.OS !== 'ios') {
      await tickRestNotification({ remainingSec: remaining, totalSec: remaining, exerciseName, setLabel });
    }
    if (scheduleDone && remaining > 0) {
      const logo = await getLogoAttachment();
      const scheduled = await scheduleNow(N, {
        identifier: DONE_ID,
        content: {
          title: 'Rest is over',
          subtitle: exerciseName || 'TrackHit',
          body: `${setLabel || 'Next set'} · ${exerciseName || 'TrackHit'}`,
          sound: 'default',
          channelId: CH_DONE,
          interruptionLevel: 'active',
          data: { kind: 'restDone', exerciseName, setLabel },
          ...(logo && Platform.OS !== 'ios' ? { attachments: [logo] } : {}),
        },
        trigger: doneTrigger(N, remaining),
      });
      if (!scheduled && Platform.OS === 'ios') {
        await scheduleNow(N, {
          identifier: DONE_ID,
          content: {
            title: 'Rest is over',
            body: `${setLabel || 'Next set'} · ${exerciseName || 'TrackHit'}`,
            sound: 'default',
            interruptionLevel: 'active',
            data: { kind: 'restDone', exerciseName, setLabel },
          },
          trigger: { seconds: Math.max(1, remaining), repeats: false },
        });
      }
    }
  } catch (err) {
    warnOnce('rest notification failed', err);
  }
}

export async function presentRestDone({ exerciseName, setLabel } = {}) {
  if (donePresented) return;
  donePresented = true;
  const N = await mod();
  lastLiveKey = '';
  if (!N || Platform.OS === 'web') return;
  try {
    await N.cancelScheduledNotificationAsync(LIVE_ID).catch(() => {});
    await N.cancelScheduledNotificationAsync(DONE_ID).catch(() => {});
    await N.dismissNotificationAsync(LIVE_ID).catch(() => {});
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    await registerNotificationCategories();
    const logo = await getLogoAttachment();
    await scheduleNow(N, {
      identifier: DONE_ID,
      content: {
        title: 'Rest is over',
        subtitle: exerciseName || 'TrackHit',
        body: `${setLabel || 'Next set'} · ${exerciseName || 'TrackHit'}`,
        sound: 'default',
        channelId: CH_DONE,
        interruptionLevel: 'active',
        data: { kind: 'restDone', exerciseName, setLabel },
        ...(logo && Platform.OS !== 'ios' ? { attachments: [logo] } : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('rest done present', err?.message || err);
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

export async function cancelRestDone() {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  try {
    await N.cancelScheduledNotificationAsync(DONE_ID).catch(() => {});
  } catch {
    /* noop */
  }
}

export async function cancelRestNotification() {
  const N = await mod();
  lastLiveKey = '';
  donePresented = false;
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
