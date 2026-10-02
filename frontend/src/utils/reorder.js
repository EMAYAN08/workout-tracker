export function moveItem(list, from, to) {
  if (!Array.isArray(list)) return list;
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function remapIndex(index, from, to) {
  if (index == null || index < 0) return index;
  if (index === from) return to;
  if (from < index && to >= index) return index - 1;
  if (from > index && to <= index) return index + 1;
  return index;
}

export function indexFromTranslation(from, ty, heights) {
  const n = heights.length;
  if (n === 0) return from;
  let center = 0;
  for (let i = 0; i < from; i += 1) center += heights[i] || 0;
  center += (heights[from] || 0) / 2 + ty;
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    acc += heights[i] || 0;
    if (center <= acc) return i;
  }
  return n - 1;
}
