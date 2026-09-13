export function smoothLine(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const { c1, c2, p2 } = bezierHandles(points, i);
    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function bezierHandles(points, i) {
  const p0 = points[i - 1] || points[i];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[i + 2] || p2;
  return {
    p1,
    p2,
    c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
  };
}

function bezierCoord(p0, c1, c2, p3, t, axis) {
  const u = 1 - t;
  return u * u * u * p0[axis] + 3 * u * u * t * c1[axis] + 3 * u * t * t * c2[axis] + t * t * t * p3[axis];
}

export function pointOnSmoothLine(points, x) {
  if (!points?.length) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const clamped = Math.min(Math.max(x, first.x), last.x);
  if (points.length === 1 || clamped <= first.x) {
    return { x: first.x, y: first.y, value: first.value, date: first.date, idx: 0 };
  }
  if (clamped >= last.x) {
    return { x: last.x, y: last.y, value: last.value, date: last.date, idx: points.length - 1 };
  }
  let i = 0;
  while (i < points.length - 2 && points[i + 1].x < clamped) i++;
  const { p1, p2, c1, c2 } = bezierHandles(points, i);
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 16; k++) {
    const mid = (lo + hi) / 2;
    if (bezierCoord(p1, c1, c2, p2, mid, 'x') < clamped) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  const y = bezierCoord(p1, c1, c2, p2, t, 'y');
  const span = p2.x - p1.x || 1;
  const u = (clamped - p1.x) / span;
  const v0 = Number(p1.value) || 0;
  const v1 = Number(p2.value) || 0;
  const value = v0 + (v1 - v0) * u;
  const date = u < 0.5 ? p1.date : p2.date;
  return { x: clamped, y, value: Number(value.toFixed(2)), date, idx: u < 0.5 ? i : i + 1 };
}
