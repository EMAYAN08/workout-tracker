import { moveItem, remapIndex, indexFromTranslation } from '../utils/reorder';

describe('moveItem', () => {
  test('moves an item forward and backward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  test('ignores invalid indexes', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, 0)).toBe(list);
    expect(moveItem(list, -1, 1)).toBe(list);
    expect(moveItem(list, 0, 9)).toBe(list);
  });
});

describe('remapIndex', () => {
  test('follows the dragged row', () => {
    expect(remapIndex(1, 1, 3)).toBe(3);
  });

  test('shifts neighbors when something slides past', () => {
    expect(remapIndex(2, 0, 3)).toBe(1);
    expect(remapIndex(1, 3, 0)).toBe(2);
  });

  test('leaves collapsed / missing indexes alone', () => {
    expect(remapIndex(-1, 0, 2)).toBe(-1);
    expect(remapIndex(null, 0, 2)).toBe(null);
  });
});

describe('indexFromTranslation', () => {
  test('picks the row under the dragged center', () => {
    const heights = [80, 80, 80];
    expect(indexFromTranslation(0, 90, heights)).toBe(1);
    expect(indexFromTranslation(2, -90, heights)).toBe(1);
    expect(indexFromTranslation(1, 0, heights)).toBe(1);
  });
});
