/**
 * Test user credentials for E2E tests
 * These users should be created in Cognito before running tests
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Primary test user (moderator/facilitator)
 */
export const TEST_USER_1: TestUser = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  name: 'Test User 1',
};

/**
 * Secondary test user (participant)
 */
export const TEST_USER_2: TestUser = {
  email: process.env.TEST_USER_2_EMAIL || 'test2@example.com',
  password: process.env.TEST_USER_2_PASSWORD || 'TestPassword123!',
  name: 'Test User 2',
};

/**
 * Additional test users for multi-participant scenarios
 */
export const TEST_USER_3: TestUser = {
  email: process.env.TEST_USER_3_EMAIL || 'test3@example.com',
  password: process.env.TEST_USER_3_PASSWORD || 'TestPassword123!',
  name: 'Test User 3',
};

export const TEST_USER_4: TestUser = {
  email: process.env.TEST_USER_4_EMAIL || 'test4@example.com',
  password: process.env.TEST_USER_4_PASSWORD || 'TestPassword123!',
  name: 'Test User 4',
};

/**
 * All test users for batch operations
 */
export const ALL_TEST_USERS: TestUser[] = [
  TEST_USER_1,
  TEST_USER_2,
  TEST_USER_3,
  TEST_USER_4,
];

/**
 * Get test user by index (0-based)
 */
export function getTestUser(index: number): TestUser {
  if (index < 0 || index >= ALL_TEST_USERS.length) {
    throw new Error(`Invalid test user index: ${index}`);
  }
  return ALL_TEST_USERS[index];
}

/**
 * Validate that required environment variables are set
 */
export function validateTestUserConfig(): void {
  const required = [
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
    'TEST_USER_2_EMAIL',
    'TEST_USER_2_PASSWORD',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing test user environment variables: ${missing.join(', ')}`);
    console.warn('Using default test credentials. Set these in .env.test for actual E2E tests.');
  }
}
