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

export function waitFrames(n = 2) {
  return new Promise((resolve) => {
    const step = (left) => {
      requestAnimationFrame(() => {
        if (left <= 1) resolve();
        else step(left - 1);
      });
    };
    step(n);
  });
}

export async function captureHiResPng(
  viewRef,
  { pixelRatio = 3, snapshotContentContainer = false, useRenderInContext = false } = {}
) {
  if (!viewRef?.current) throw new Error('Nothing to share');
  return captureRef(viewRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    pixelRatio,
    snapshotContentContainer,
    useRenderInContext,
  });
}

export async function shareFile(uri, { filename, mimeType, uti, message } = {}) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: mimeType || 'image/png',
      UTI: uti || 'public.png',
      dialogTitle: filename || 'TrackHit',
    });
  } else if (message) {
    await RNShare.share({ message, url: uri });
  } else {
    Alert.alert('Share', 'Sharing is not available on this device.');
  }
}

export async function shareViewAsPng(viewRef, { filename, message, pixelRatio = 3 } = {}) {
  if (Platform.OS === 'web') {
    await RNShare.share({ message: message || 'TrackHit' });
    return { ok: true };
  }
  const uri = await captureHiResPng(viewRef, { pixelRatio });
  await shareFile(uri, { filename, message, mimeType: 'image/png', uti: 'public.png' });
  return { ok: true, uri };
}
