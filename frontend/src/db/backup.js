import { Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { buildBackup, parseBackup } from './schema';

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function exportBackup(snapshot) {
  const payload = buildBackup(snapshot);
  const json = JSON.stringify(payload, null, 2);
  const filename = `trackit-backup-${stamp()}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, count: payload.workouts.length };
  }

  let FileSystem;
  try {
    FileSystem = await import('expo-file-system/legacy');
  } catch {
    FileSystem = await import('expo-file-system');
  }
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const path = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(path, json);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export TrackIt data',
      UTI: 'public.json',
    });
  }
  return { ok: true, path, count: payload.workouts.length };
}

export async function pickBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  let text = '';
  if (Platform.OS === 'web' && asset.file) {
    text = await asset.file.text();
  } else if (asset.uri) {
    try {
      const FileSystem = await import('expo-file-system/legacy');
      text = await FileSystem.readAsStringAsync(asset.uri);
    } catch {
      const res = await fetch(asset.uri);
      text = await res.text();
    }
  }
  if (!text) throw new Error('Could not read backup file');
  return parseBackup(text);
}

export function confirmImportMode() {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm('Import this backup into TrackIt?')
        : false;
      if (!ok) {
        resolve(null);
        return;
      }
      const replace = window.confirm('Replace all data on this phone? Cancel = merge (keep both, overwrite matching IDs).');
      resolve(replace ? 'replace' : 'merge');
      return;
    }
    Alert.alert('Import backup', 'Merge keeps existing sessions. Replace wipes this phone first.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Merge', onPress: () => resolve('merge') },
      { text: 'Replace all', style: 'destructive', onPress: () => resolve('replace') },
    ]);
  });
}
