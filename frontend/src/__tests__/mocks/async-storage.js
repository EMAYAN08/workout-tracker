const memory = new Map();

const AsyncStorage = {
  setItem: jest.fn(async (key, value) => {
    memory.set(String(key), String(value));
  }),
  getItem: jest.fn(async (key) => (memory.has(String(key)) ? memory.get(String(key)) : null)),
  removeItem: jest.fn(async (key) => {
    memory.delete(String(key));
  }),
  clear: jest.fn(async () => {
    memory.clear();
  }),
  getAllKeys: jest.fn(async () => Array.from(memory.keys())),
  multiGet: jest.fn(async (keys) => keys.map((k) => [k, memory.has(String(k)) ? memory.get(String(k)) : null])),
  multiSet: jest.fn(async (pairs) => {
    for (const [k, v] of pairs) memory.set(String(k), String(v));
  }),
  _reset() {
    memory.clear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.removeItem.mockClear();
    AsyncStorage.clear.mockClear();
    AsyncStorage.getAllKeys.mockClear();
    AsyncStorage.multiGet.mockClear();
    AsyncStorage.multiSet.mockClear();
  },
  _dump() {
    return Object.fromEntries(memory);
  },
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
