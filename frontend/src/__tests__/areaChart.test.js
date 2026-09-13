import { pointOnSmoothLine } from '../utils/chartPath';

describe('pointOnSmoothLine', () => {
  const pts = [
    { x: 0, y: 100, value: 10, date: 'A' },
    { x: 50, y: 40, value: 20, date: 'B' },
    { x: 100, y: 80, value: 15, date: 'C' },
  ];

  test('clamps to the first point', () => {
    const p = pointOnSmoothLine(pts, -20);
    expect(p.x).toBe(0);
    expect(p.y).toBe(100);
    expect(p.date).toBe('A');
  });

  test('clamps to the last point', () => {
    const p = pointOnSmoothLine(pts, 400);
    expect(p.x).toBe(100);
    expect(p.y).toBe(80);
    expect(p.date).toBe('C');
  });

  test('tracks along the curve between points', () => {
    const p = pointOnSmoothLine(pts, 25);
    expect(p.x).toBe(25);
    expect(p.y).toBeGreaterThan(40);
    expect(p.y).toBeLessThan(100);
    expect(p.value).toBeGreaterThan(10);
    expect(p.value).toBeLessThan(20);
  });

  test('empty returns null', () => {
    expect(pointOnSmoothLine([], 10)).toBeNull();
    expect(pointOnSmoothLine(null, 10)).toBeNull();
  });
});
