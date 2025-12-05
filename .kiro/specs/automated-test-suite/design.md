# Design Document: Automated Test Suite

## Overview

This design document outlines the implementation of a comprehensive automated test suite for Scrum Reborn. The test suite will cover three layers: backend Lambda functions (unit tests), frontend React hooks (unit tests), and end-to-end multi-device synchronization (E2E tests). The goal is to automate the manual testing procedures documented in TESTING-GUIDE.md and E2E-TESTING-PLAN.md, ensuring that the happy path functionality (authentication, room operations, voting, real-time sync) works correctly.

### Design Goals

1. **Comprehensive Coverage**: Test all critical paths identified in TESTING-STATUS-REPORT.md
2. **Fast Feedback**: Unit tests complete in <30s, E2E tests in <5 minutes
3. **CI/CD Integration**: All tests run automatically on every commit
4. **Maintainability**: Tests are easy to understand and update as features evolve
5. **Reliability**: Tests are deterministic and don't produce false positives

### Testing Pyramid

```
        /\
       /  \      E2E Tests (Playwright)
      /    \     - Multi-device sync
     /------\    - Real user flows
    /        \   
   /  Unit    \  Unit Tests (Jest)
  /   Tests    \ - Lambda functions
 /______________\- React hooks
```

## Architecture

### Test Framework Stack

| Layer | Framework | Purpose | Location |
|-------|-----------|---------|----------|
| Backend Unit | Jest + ts-jest | Lambda function testing | `infra/lambda/**/__tests__/` |
| Frontend Unit | Jest + React Testing Library | Hook and component testing | `hooks/__tests__/`, `components/__tests__/` |
| E2E | Playwright | Multi-device synchronization | `e2e/` |
| CI/CD | GitHub Actions | Automated test execution | `.github/workflows/test.yml` |

### Test Environment Configuration

```
┌─────────────────────────────────────────────────────────┐
│                    Test Environments                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Unit Tests (Backend)                                    │
│  ├─ Mocked DynamoDB Client                              │
│  ├─ Mocked CloudWatch Client                            │
│  └─ In-memory test data                                 │
│                                                          │
│  Unit Tests (Frontend)                                   │
│  ├─ Mocked Amplify Auth                                 │
│  ├─ Mocked GraphQL Client                               │
│  └─ React Testing Library render                        │
│                                                          │
│  E2E Tests                                               │
│  ├─ Real AWS AppSync endpoint                           │
│  ├─ Real Cognito authentication                         │
│  ├─ Real DynamoDB table                                 │
│  └─ Playwright browser automation                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Backend Unit Tests (Lambda Functions)

#### Test Structure

```typescript
// infra/lambda/mutations/__tests__/mutations.test.ts
describe('Mutations Lambda', () => {
  describe('Vote Tally', () => {
    it('should calculate correct average for numeric votes');
    it('should exclude special cards from average');
    it('should return null average when all votes are special cards');
  });
  
  describe('Room Code Validation', () => {
    it('should accept valid 6-character alphanumeric codes');
    it('should reject codes with lowercase letters');
    it('should reject codes with special characters');
    it('should reject codes shorter than 3 characters');
  });
  
  describe('Moderator Authorization', () => {
    it('should allow moderator to reveal votes');
    it('should deny non-moderator from revealing votes');
    it('should allow moderator to change room stage');
  });
});
```

#### Mocking Strategy

**DynamoDB Client Mocking**:
```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoMock = mockClient(DynamoDBClient);

beforeEach(() => {
  dynamoMock.reset();
});

// Mock successful PutItem
dynamoMock.on(PutItemCommand).resolves({});

// Mock GetItem with test data
dynamoMock.on(GetItemCommand).resolves({
  Item: marshall({ userId: 'test-user', role: 'MODERATOR' })
});
```

**CloudWatch Client Mocking**:
```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatchMock = mockClient(CloudWatchClient);
cloudwatchMock.on(PutMetricDataCommand).resolves({});
```

#### Test Data Fixtures

```typescript
// infra/lambda/__tests__/fixtures.ts
export const mockRoom = {
  id: 'test-room-123',
  name: 'Test Room',
  code: 'ABC123',
  stage: 'PLANNING',
  createdBy: 'user-123',
  createdAt: '2025-11-14T00:00:00Z',
  updatedAt: '2025-11-14T00:00:00Z',
};

export const mockVotes = [
  { userId: 'user-1', storyId: 'story-1', value: '5' },
  { userId: 'user-2', storyId: 'story-1', value: '8' },
  { userId: 'user-3', storyId: 'story-1', value: '☕' }, // Special card
];

export const mockPresence = {
  userId: 'user-123',
  roomId: 'room-123',
  displayName: 'Test User',
  role: 'MODERATOR',
  state: 'ONLINE',
  lastSeen: '2025-11-14T00:00:00Z',
};
```

### 2. Tally Lambda Tests

#### Test Structure

```typescript
// infra/lambda/tally/__tests__/tally.test.ts
describe('Tally Lambda', () => {
  describe('Vote Aggregation', () => {
    it('should compute correct average for numeric votes');
    it('should exclude special cards from average calculation');
    it('should handle empty vote list');
    it('should handle all special cards');
    it('should update story with correct voteCount and avgVote');
  });
  
  describe('DynamoDB Streams Processing', () => {
    it('should process INSERT events');
    it('should process MODIFY events');
    it('should process REMOVE events');
    it('should deduplicate multiple events for same story');
    it('should handle pagination for >100 votes');
  });
  
  describe('Error Handling', () => {
    it('should throw error on DynamoDB query failure');
    it('should throw error on story update failure');
    it('should log structured error context');
  });
});
```

#### Mock DynamoDB Stream Events

```typescript
// infra/lambda/tally/__tests__/fixtures.ts
export const mockStreamEvent = {
  Records: [
    {
      eventID: 'event-1',
      eventName: 'INSERT' as const,
      dynamodb: {
        Keys: marshall({ PK: 'ROOM#room-1', SK: 'VOTE#story-1#user-1' }),
        NewImage: marshall({
          PK: 'ROOM#room-1',
          SK: 'VOTE#story-1#user-1',
          userId: 'user-1',
          storyId: 'story-1',
          roomId: 'room-1',
          value: '5',
          createdAt: '2025-11-14T00:00:00Z',
        }),
      },
    },
  ],
};
```

### 3. Frontend Unit Tests (React Hooks)

#### useAuth Hook Tests

```typescript
// hooks/__tests__/useAuth.test.ts
describe('useAuth', () => {
  describe('Sign In', () => {
    it('should sign in with valid credentials');
    it('should return error for invalid credentials');
    it('should set isAuthenticated to true on success');
    it('should extract userId from Cognito response');
  });
  
  describe('Sign Up', () => {
    it('should create new user account');
    it('should require email confirmation');
    it('should validate password strength');
  });
  
  describe('Token Management', () => {
    it('should return valid JWT token');
    it('should refresh expired token');
    it('should clear token on sign out');
  });
});
```

#### Mocking Amplify Auth

```typescript
import { signIn, signUp, getCurrentUser } from '@aws-amplify/auth';

jest.mock('@aws-amplify/auth', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn(),
  confirmSignUp: jest.fn(),
}));

// Mock successful sign in
(signIn as jest.Mock).mockResolvedValue({
  isSignedIn: true,
  nextStep: { signInStep: 'DONE' },
});

// Mock current user
(getCurrentUser as jest.Mock).mockResolvedValue({
  userId: 'test-user-123',
  username: 'test@example.com',
});
```

#### useGraphQL Hook Tests

```typescript
// hooks/__tests__/useGraphQL.test.ts
describe('useGraphQL', () => {
  describe('Mutations', () => {
    it('should execute mutation successfully');
    it('should handle mutation errors');
    it('should set loading state during mutation');
  });
  
  describe('Optimistic Updates', () => {
    it('should apply optimistic update immediately');
    it('should rollback on mutation failure');
    it('should persist update on mutation success');
  });
});
```

#### useSubscription Hook Tests

```typescript
// hooks/__tests__/useSubscription.test.ts
describe('useSubscription', () => {
  describe('Connection', () => {
    it('should establish subscription connection');
    it('should set isSubscribed to true when connected');
    it('should handle connection errors');
  });
  
  describe('Data Handling', () => {
    it('should receive subscription data');
    it('should call onData callback with new data');
    it('should update data state');
  });
  
  describe('Cleanup', () => {
    it('should unsubscribe on unmount');
    it('should not update state after unmount');
  });
});
```

#### Mocking GraphQL Client

```typescript
import { generateClient } from 'aws-amplify/api';

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(),
}));

const mockGraphQL = jest.fn();
const mockSubscribe = jest.fn();

(generateClient as jest.Mock).mockReturnValue({
  graphql: mockGraphQL,
});

// Mock successful mutation
mockGraphQL.mockResolvedValue({
  data: { createRoom: { id: 'room-123', name: 'Test Room' } },
  errors: null,
});

// Mock subscription
mockGraphQL.mockReturnValue({
  subscribe: mockSubscribe,
});
```

### 4. End-to-End Tests (Playwright)

#### Test Structure

```typescript
// e2e/multi-device-sync.spec.ts
describe('Multi-Device Synchronization', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  
  beforeAll(async () => {
    // Create two browser contexts (simulating two devices)
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();
  });
  
  test('two users join same room and see each other', async () => {
    // User 1 creates room
    await page1.goto('/');
    await page1.fill('[data-testid="room-name"]', 'Test Room');
    await page1.click('[data-testid="create-room"]');
    const roomCode = await page1.textContent('[data-testid="room-code"]');
    
    // User 2 joins room
    await page2.goto('/');
    await page2.fill('[data-testid="room-code-input"]', roomCode);
    await page2.click('[data-testid="join-room"]');
    
    // Verify both users see each other
    await expect(page1.locator('[data-testid="participant-list"]')).toContainText('User 2');
    await expect(page2.locator('[data-testid="participant-list"]')).toContainText('User 1');
  });
  
  test('story creation syncs within 250ms', async () => {
    const startTime = Date.now();
    
    // User 1 creates story
    await page1.fill('[data-testid="story-title"]', 'Test Story');
    await page1.click('[data-testid="create-story"]');
    
    // User 2 sees story
    await page2.waitForSelector('[data-testid="story-Test Story"]', { timeout: 500 });
    
    const latency = Date.now() - startTime;
    expect(latency).toBeLessThan(250);
  });
  
  test('vote casting updates tally within 2s', async () => {
    // User 1 casts vote
    await page1.click('[data-testid="vote-5"]');
    
    // User 2 sees vote count update
    await page2.waitForSelector('[data-testid="vote-count-1"]', { timeout: 2000 });
    
    // User 2 casts vote
    await page2.click('[data-testid="vote-8"]');
    
    // Both users see updated tally
    await page1.waitForSelector('[data-testid="vote-count-2"]', { timeout: 2000 });
  });
  
  test('vote reveal syncs within 250ms', async () => {
    const startTime = Date.now();
    
    // User 1 (moderator) reveals votes
    await page1.click('[data-testid="reveal-votes"]');
    
    // User 2 sees revealed votes
    await page2.waitForSelector('[data-testid="revealed-votes"]', { timeout: 500 });
    
    const latency = Date.now() - startTime;
    expect(latency).toBeLessThan(250);
  });
});
```

#### Authentication Helper

```typescript
// e2e/helpers/auth.ts
export async function signInTestUser(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="sign-in"]');
  await page.waitForSelector('[data-testid="dashboard"]');
}

export async function createTestUser(email: string, password: string) {
  // Use Cognito Admin API to create test user
  const cognito = new CognitoIdentityProviderClient({});
  await cognito.send(new AdminCreateUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: email,
    TemporaryPassword: password,
    MessageAction: 'SUPPRESS',
  }));
}
```

#### Latency Measurement Utilities

```typescript
// e2e/helpers/metrics.ts
export async function measureLatency(
  action: () => Promise<void>,
  verification: () => Promise<void>
): Promise<number> {
  const startTime = Date.now();
  await action();
  await verification();
  return Date.now() - startTime;
}

export function assertLatency(latency: number, target: number, operation: string) {
  if (latency > target) {
    console.warn(`⚠️ ${operation} latency ${latency}ms exceeds target ${target}ms`);
  }
  expect(latency).toBeLessThan(target * 1.5); // Allow 50% buffer
}
```

## Data Models

### Test Configuration

```typescript
// jest.config.backend.js
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
};
```

```typescript
// jest.config.frontend.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/hooks', '<rootDir>/components'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'hooks/**/*.ts',
    'components/**/*.tsx',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
};
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for multi-device tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for multi-device tests
  reporter: 'html',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Environment Variables for Tests

```bash
# .env.test
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_APPSYNC_ENDPOINT=https://XXXXXXXXXXXXXXXXXXXXXXXXXX.appsync-api.us-east-1.amazonaws.com/graphql
VITE_APPSYNC_REGION=us-east-1
VITE_APPSYNC_AUTH_TYPE=AMAZON_COGNITO_USER_POOLS

# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_USER_2_EMAIL=test2@example.com
TEST_USER_2_PASSWORD=TestPassword123!
```

## Error Handling

### Test Failure Reporting

```typescript
// e2e/helpers/reporter.ts
export class CustomReporter {
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed') {
      console.error(`❌ Test failed: ${test.title}`);
      console.error(`   Error: ${result.error?.message}`);
      console.error(`   Duration: ${result.duration}ms`);
      
      // Capture screenshot and logs
      if (result.attachments) {
        result.attachments.forEach(attachment => {
          console.log(`   Attachment: ${attachment.name} - ${attachment.path}`);
        });
      }
    }
  }
}
```

### Retry Strategy

**Unit Tests**: No retries (should be deterministic)

**E2E Tests**: 
- Retry up to 2 times on failure
- Capture video and screenshot on failure
- Log network requests for debugging

### Timeout Configuration

```typescript
// Test timeouts
const TIMEOUTS = {
  UNIT_TEST: 5000,           // 5s for unit tests
  E2E_ACTION: 10000,         // 10s for E2E actions
  E2E_SYNC: 2000,            // 2s for sync verification
  E2E_TOTAL: 60000,          // 60s for entire E2E test
};
```

## Testing Strategy

### Test Execution Order

1. **Pre-commit**: Run unit tests only (fast feedback)
2. **PR Creation**: Run all tests (unit + E2E)
3. **Merge to main**: Run all tests + deploy to staging
4. **Nightly**: Run extended E2E suite + performance tests

### Test Data Management

**Unit Tests**: Use in-memory fixtures, no external dependencies

**E2E Tests**: 
- Create test users via Cognito Admin API
- Clean up test data after each test
- Use unique room codes to avoid conflicts

```typescript
// e2e/helpers/cleanup.ts
export async function cleanupTestData(roomId: string) {
  const dynamodb = new DynamoDBClient({});
  
  // Delete all items for the room
  const items = await dynamodb.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: marshall({ ':pk': `ROOM#${roomId}` }),
  }));
  
  for (const item of items.Items || []) {
    await dynamodb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: item.PK, SK: item.SK },
    }));
  }
}
```

### Coverage Goals

| Layer | Target Coverage | Priority |
|-------|----------------|----------|
| Backend Lambda | 80% lines, 70% branches | High |
| Frontend Hooks | 80% lines, 70% branches | High |
| Frontend Components | 60% lines, 50% branches | Medium |
| E2E Critical Paths | 100% of happy path | High |

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd infra
          npm ci
      - name: Run backend unit tests
        run: |
          cd infra
          npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./infra/coverage/lcov.info
          flags: backend

  unit-tests-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run frontend unit tests
        run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests-backend, unit-tests-frontend]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        env:
          APP_URL: ${{ secrets.STAGING_APP_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### NPM Scripts

```json
{
  "scripts": {
    "test": "jest --config jest.config.frontend.js",
    "test:backend": "cd infra && jest --config ../jest.config.backend.js",
    "test:frontend": "jest --config jest.config.frontend.js",
    "test:e2e": "playwright test",
    "test:all": "npm run test:backend && npm run test:frontend && npm run test:e2e",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Performance Considerations

### Test Execution Time Targets

- Backend unit tests: <10 seconds
- Frontend unit tests: <15 seconds
- E2E tests: <5 minutes
- Total CI pipeline: <10 minutes

### Optimization Strategies

1. **Parallel Execution**: Run unit tests in parallel
2. **Test Sharding**: Split E2E tests across multiple workers
3. **Selective Testing**: Only run affected tests on PR
4. **Caching**: Cache node_modules and Playwright browsers

## Security Considerations

### Test Credentials

- Store test credentials in GitHub Secrets
- Use dedicated test user pool (not production)
- Rotate test credentials monthly
- Never commit credentials to repository

### Test Data Isolation

- Use separate DynamoDB table for tests
- Clean up test data after each run
- Use unique identifiers to avoid conflicts

## Monitoring and Observability

### Test Metrics

Track the following metrics in CI/CD:

- Test execution time (per suite)
- Test pass/fail rate
- Code coverage percentage
- Flaky test detection (tests that fail intermittently)

### Alerting

- Slack notification on test failure in main branch
- Email notification on coverage drop >5%
- Dashboard showing test trends over time

## Future Enhancements

### Phase 2 (Post-MVP)

1. **Visual Regression Testing**: Use Playwright screenshots to detect UI changes
2. **Performance Testing**: Add load tests with Artillery or k6
3. **Accessibility Testing**: Add axe-core for WCAG compliance
4. **Contract Testing**: Add Pact for API contract verification
5. **Mutation Testing**: Use Stryker to verify test quality

### Phase 3 (Production Hardening)

1. **Chaos Engineering**: Inject failures to test resilience
2. **Synthetic Monitoring**: Run E2E tests in production every hour
3. **A/B Test Validation**: Automated tests for feature flags
4. **Security Testing**: Add OWASP ZAP for vulnerability scanning

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-14  
**Status**: Ready for Implementation
