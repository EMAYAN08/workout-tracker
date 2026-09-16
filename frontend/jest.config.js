module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  transform: {
    '^.+\\.js$': [
      'babel-jest',
      {
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/db/**/*.js',
    'src/data/catalog.js',
    'src/data/mockData.js',
    'src/theme.js',
    'src/notifications.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__tests__/mocks/react-native.js',
    '@react-native-async-storage/async-storage': '<rootDir>/src/__tests__/mocks/async-storage.js',
    'expo-sharing': '<rootDir>/src/__tests__/mocks/empty.js',
    'expo-document-picker': '<rootDir>/src/__tests__/mocks/empty.js',
    '^expo-file-system(/.*)?$': '<rootDir>/src/__tests__/mocks/empty.js',
    'react-native-view-shot': '<rootDir>/src/__tests__/mocks/empty.js',
  },
};
