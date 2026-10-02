import * as Haptics from 'expo-haptics';

let lastAt = 0;
const MIN_GAP = 28;

export function haptic(kind = 'light') {
  const now = Date.now();
  if (kind === 'selection' && now - lastAt < MIN_GAP) return;
  lastAt = now;
  try {
    if (kind === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (kind === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (kind === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (kind === 'selection') {
      Haptics.selectionAsync();
    } else if (kind === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (kind === 'heavy') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // web / simulator
  }
}
