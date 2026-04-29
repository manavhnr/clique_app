import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  globalSetup: './src/tests/jest.globalSetup.ts',
  globalTeardown: './src/tests/jest.globalTeardown.ts',
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
};

export default config;
