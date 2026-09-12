import { Platform } from 'react-native';

const REST_ID = 'trackit-rest-done';
let Notifications = null;

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

export async function ensureNotificationPermission() {
  const N = await mod();
  if (!N || Platform.OS === 'web') return false;
  const existing = await N.getPermissionsAsync();
  if (existing.granted || existing.iosStatus === N.IosAuthorizationStatus?.PROVISIONAL) return true;
  const asked = await N.requestPermissionsAsync();
  return asked.granted || asked.iosStatus === N.IosAuthorizationStatus?.PROVISIONAL;
}

export async function scheduleRestNotification(seconds) {
  const N = await mod();
  if (!N || Platform.OS === 'web' || !seconds || seconds < 1) return;
  try {
    await N.cancelScheduledNotificationAsync(REST_ID).catch(() => {});
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    await N.scheduleNotificationAsync({
      identifier: REST_ID,
      content: {
        title: 'Rest is over',
        body: 'Next set. Let’s go.',
        sound: true,
        interruptionLevel: 'timeSensitive',
      },
      trigger: { type: N.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval', seconds, repeats: false },
    });
  } catch (err) {
    console.warn('rest notification failed', err?.message || err);
  }
}

export async function cancelRestNotification() {
  const N = await mod();
  if (!N || Platform.OS === 'web') return;
  try {
    await N.cancelScheduledNotificationAsync(REST_ID);
  } catch {
    /* noop */
  }
}
