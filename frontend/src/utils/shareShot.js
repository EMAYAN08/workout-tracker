import { Platform, Share as RNShare, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

function hexRgb(hex) {
  const h = String(hex || '#070707').replace('#', '');
  if (h.length < 6) return '0.027 0.027 0.027';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

export function jpegDimensions(b64) {
  const bin = global.atob(b64);
  let i = 2;
  while (i + 9 < bin.length) {
    if (bin.charCodeAt(i) !== 0xff) break;
    const marker = bin.charCodeAt(i + 1);
    const len = (bin.charCodeAt(i + 2) << 8) + bin.charCodeAt(i + 3);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (bin.charCodeAt(i + 5) << 8) + bin.charCodeAt(i + 6);
      const width = (bin.charCodeAt(i + 7) << 8) + bin.charCodeAt(i + 8);
      return { width, height };
    }
    i += 2 + len;
  }
  return { width: 1080, height: 1440 };
}

export function jpegToPaddedPdf({ jpegBase64, pad = 44, bg = '#070707' }) {
  const jpeg = global.atob(jpegBase64);
  const { width, height } = jpegDimensions(jpegBase64);
  const pageW = 612;
  const innerW = pageW - pad * 2;
  const drawW = innerW;
  const drawH = (height / Math.max(width, 1)) * innerW;
  const pageH = Math.ceil(drawH + pad * 2);
  const x = pad;
  const y = pad;
  const content = `q ${hexRgb(bg)} rg 0 0 ${pageW} ${pageH} re f Q\nq ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  const addObj = (body, stream) => {
    offsets.push(pdf.length);
    const n = offsets.length - 1;
    if (stream != null) {
      pdf += `${n} 0 obj\n${body}\nstream\n${stream}\nendstream\nendobj\n`;
    } else {
      pdf += `${n} 0 obj\n${body}\nendobj\n`;
    }
  };

  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`
  );
  addObj(`<< /Length ${content.length} >>`, content);
  addObj(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,
    jpeg
  );

  const xrefAt = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return pdf;
}

function toBase64(bin) {
  if (typeof global.btoa === 'function') return global.btoa(bin);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bin.length; i += 3) {
    const a = bin.charCodeAt(i);
    const b = i + 1 < bin.length ? bin.charCodeAt(i + 1) : 0;
    const c = i + 2 < bin.length ? bin.charCodeAt(i + 2) : 0;
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bin.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bin.length ? chars[c & 63] : '=';
  }
  return out;
}

async function fs() {
  try {
    return await import('expo-file-system/legacy');
  } catch {
    return await import('expo-file-system');
  }
}

export async function shareViewAsPdf(viewRef, { filename, background }) {
  if (!viewRef?.current) throw new Error('Nothing to share');
  const jpegBase64 = await captureRef(viewRef, {
    format: 'jpg',
    quality: 0.88,
    result: 'base64',
  });
  const pdf = jpegToPaddedPdf({ jpegBase64, pad: 44, bg: background || '#070707' });
  const FileSystem = await fs();
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  const path = `${dir}${filename || 'TrackIt.pdf'}`;
  try {
    if (FileSystem.deleteAsync) await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    /* ok */
  }
  const encoding = FileSystem.EncodingType?.Base64 || 'base64';
  await FileSystem.writeAsStringAsync(path, toBase64(pdf), { encoding });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share TrackIt',
    });
  } else {
    Alert.alert('Share', 'Sharing is not available on this device.');
  }
  return { ok: true, path };
}

export async function shareViewAsPng(viewRef, { filename, message } = {}) {
  if (Platform.OS === 'web') {
    await RNShare.share({ message: message || 'TrackIt' });
    return { ok: true };
  }
  if (!viewRef?.current) throw new Error('Nothing to share');
  const uri = await captureRef(viewRef, { format: 'png', quality: 1, result: 'tmpfile' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: filename || 'TrackIt',
    });
  } else {
    await RNShare.share({ message: message || 'TrackIt', url: uri });
  }
  return { ok: true, uri };
}
