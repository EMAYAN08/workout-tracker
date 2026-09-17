import { jpegToPaddedPdf, jpegDimensions, captureHiResPng } from '../utils/shareShot';
import { captureRef } from 'react-native-view-shot';
import fs from 'fs';
import path from 'path';

// 8x8 JPEG (SOI + APP0 + SOF0 + SOS + EOI-ish). Dimensions parsed from SOF.
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNExoTExo3Ki8qNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAAEAAQMBIgACEQEDEQH/xAAUAAEAAAAAAAAAAAAAAAAAAAAK/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAAqgH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/ACoP/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=';

describe('jpegToPaddedPdf', () => {
  test('wraps a jpeg in a padded single-page PDF', () => {
    const pdf = jpegToPaddedPdf({ jpegBase64: TINY_JPEG_B64, pad: 44, bg: '#070707' });
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(pdf).toContain('/DCTDecode');
    expect(pdf).toContain('/Im0');
    expect(pdf).toContain('MediaBox');
  });
});

describe('jpegDimensions', () => {
  test('reads SOF width/height', () => {
    const dim = jpegDimensions(TINY_JPEG_B64);
    expect(dim.width).toBeGreaterThan(0);
    expect(dim.height).toBeGreaterThan(0);
  });
});

describe('captureHiResPng', () => {
  beforeEach(() => {
    captureRef.mockClear();
  });

  test('throws when the ref is empty', async () => {
    await expect(captureHiResPng(null)).rejects.toThrow('Nothing to share');
    await expect(captureHiResPng({ current: null })).rejects.toThrow('Nothing to share');
    expect(captureRef).not.toHaveBeenCalled();
  });

  test('does not force useRenderInContext on iOS (blank-shot bug)', async () => {
    const ref = { current: {} };
    await captureHiResPng(ref);
    expect(captureRef).toHaveBeenCalledTimes(1);
    const opts = captureRef.mock.calls[0][1];
    expect(opts.useRenderInContext).toBe(false);
    expect(opts.snapshotContentContainer).toBe(false);
    expect(opts.format).toBe('png');
    expect(opts.result).toBe('tmpfile');
  });

  test('only enables renderInContext when the caller asks', async () => {
    await captureHiResPng({ current: {} }, { useRenderInContext: true });
    expect(captureRef.mock.calls[0][1].useRenderInContext).toBe(true);
  });
});

describe('export has no watermark', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  test('TrackHitMark component is gone', () => {
    const mark = path.join(__dirname, '..', 'components/ui/TrackHitMark.jsx');
    expect(fs.existsSync(mark)).toBe(false);
  });

  test('consistency map export does not stamp a watermark', () => {
    const src = read('components/Dashboard/ConsistencyMap.jsx');
    expect(src).not.toMatch(/TrackHitMark/);
    expect(src).not.toMatch(/setStamp/);
    expect(src).toMatch(/captureHiResPng\(mapRef/);
  });

  test('history export does not stamp a watermark', () => {
    const src = read('components/Calendar/WorkoutDetailView.jsx');
    expect(src).not.toMatch(/TrackHitMark/);
    expect(src).not.toMatch(/setStamp/);
    expect(src).toMatch(/captureHiResPng\(shotRef/);
  });
});
