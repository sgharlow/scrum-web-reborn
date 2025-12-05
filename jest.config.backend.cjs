module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/infra/lambda'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'infra/lambda/**/*.ts',
    '!infra/lambda/**/__tests__/**',
    '!infra/lambda/**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
      },
    }],
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/fixtures\\.ts$/',
    '/__tests__/mocks\\.ts$/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(mnemonist)/)',
  ],
};
