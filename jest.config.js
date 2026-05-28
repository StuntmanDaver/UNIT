module.exports = {
  preset: 'jest-expo',
  roots: [
    '<rootDir>/__tests__',
    '<rootDir>/app',
    '<rootDir>/components',
    '<rootDir>/constants',
    '<rootDir>/hooks',
    '<rootDir>/lib',
    '<rootDir>/services',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|native-base|react-native-svg|@tanstack/.*|date-fns|lucide-react-native)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.claude/',
    '/android/',
    '/ios/',
    '/.expo/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/.expo/',
    '<rootDir>/dist/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  watchman: false,
};
