import { jpegToPaddedPdf, jpegDimensions } from '../utils/shareShot';

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
