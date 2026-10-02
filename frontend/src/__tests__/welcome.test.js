import { WELCOME_PHRASES } from '../data/welcomePhrases';

describe('WELCOME_PHRASES', () => {
  test('are short workout lines in the app voice', () => {
    expect(WELCOME_PHRASES.length).toBeGreaterThanOrEqual(30);
    for (const line of WELCOME_PHRASES) {
      expect(line.length).toBeGreaterThan(8);
      expect(line.length).toBeLessThan(48);
      expect(line.endsWith('.')).toBe(true);
    }
    expect(new Set(WELCOME_PHRASES).size).toBe(WELCOME_PHRASES.length);
  });
});
