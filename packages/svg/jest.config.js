/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  rootDir: '.',
  setupFiles: ['<rootDir>/../../jest.setup.js', '<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|react-native-svg)/)',
  ],
}
