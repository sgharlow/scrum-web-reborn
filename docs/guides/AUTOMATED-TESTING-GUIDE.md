# Automated Testing Guide

**Last Updated**: November 14, 2025  
**Status**: Production Ready

---

## Overview

Scrum Reborn has a comprehensive automated test suite covering:
- **Backend Lambda Functions** (Unit Tests)
- **Frontend React Hooks** (Unit Tests)
- **End-to-End Multi-Device Synchronization** (E2E Tests)

All tests run automatically in CI/CD on every push and pull request.

---

## Quick Start

### Run All Tests

```bash
# Run all test suites
npm run test:all

# Run specific test suites
npm run test:backend    # Backend Lambda tests
npm run test:frontend   # Frontend hook tests
npm run test:e2e        # E2E Playwright tests
```

### Run Tests with Coverage

```bash
# Frontend tests with coverage
npm run test:coverage

# Backend tests with coverage
npm run test:backend -- --coverage
```

### Watch Mode (Development)

```bash
# Watch frontend tests
npm run test:watch

# Watch backend tests
npm run test:backend -- --watch
```

---

## Test Suite Structure

```
scrum-web-reborn/
├── infra/lambda/
│   ├── mutations/__tests__/
│   │   └── mutations.test.ts        # 23 tests - Room code, auth, mutations
│   ├── tally/__tests__/
│   │   └── tally.test.ts            # 15 tests - Vote tally logic
│   └── __tests__/
│       └── fixtures.ts              # Shared test data
├── hooks/__tests__/
│   ├── useAuth.test.ts              # 14 tests - Authentication
│   ├── useGraphQL.test.ts           # 15 tests - GraphQL operations
│   └── useSubscription.test.ts      # 14 tests - Real-time subscriptions
├── e2e/
│   ├── auth-flow.spec.ts            # 4 tests - Auth E2E
│   ├── multi-device-sync.spec.ts    # 4 tests - Multi-device sync
│   ├── helpers/
│   │   ├── auth.ts                  # Auth helpers
│   │   ├── metrics.ts               # Latency measurement
│   │   └── cleanup.ts               # Test data cleanup
│   └── fixtures/
│       └── test-users.ts            # Test user credentials
├── jest.config.backend.cjs          # Backend Jest config
├── jest.config.frontend.cjs         # Frontend Jest config
├── playwright.config.ts             # Playwright config
└── jest.setup.ts                    # Jest setup file
```

---

## Backend Lambda Tests

### What's Tested

**Mutations Lambda** (`infra/lambda/mutations/__tests__/mutations.test.ts`):
- Room code validation (valid/invalid formats)
- Moderator authorization (reveal votes, change stage, delete stories)
- Vote value validation (numeric votes, special cards)
- Room creation and joining
- Error handling

**Tally Lambda** (`infra/lambda/tally/__tests__/tally.test.ts`):
- Vote aggregation (numeric votes, special cards)
- Average calculation (correct math, null for all special cards)
- DynamoDB Streams event processing (INSERT, MODIFY, REMOVE)
- Pagination handling (>100 votes)
- Error handling (query failures, update failures)

### Running Backend Tests

```bash
# Run all backend tests
npm run test:backend

# Run specific test file
npm run test:backend -- mutations.test.ts

# Run with coverage
npm run test:backend -- --coverage

# Run in watch mode
npm run test:backend -- --watch
```

### Coverage Thresholds

Backend tests must meet these coverage thresholds:
- **Lines**: 80%
- **Branches**: 70%
- **Functions**: 80%
- **Statements**: 80%

### Example Test

```typescript
describe('Vote Tally', () => {
  it('should calculate correct average for numeric votes', async () => {
    // Mock DynamoDB to return votes
    dynamoMock.on(QueryCommand).resolves({
      Items: [
        marshall({ value: '5' }),
        marshall({ value: '8' }),
        marshall({ value: '13' }),
      ],
    });

    // Process stream event
    await handler(mockStreamEvent);

    // Verify tally was updated
    expect(dynamoMock).toHaveReceivedCommandWith(UpdateItemCommand, {
      ExpressionAttributeValues: {
        ':voteCount': { N: '3' },
        ':avgVote': { N: '8.67' }, // (5+8+13)/3
      },
    });
  });
});
```

---

## Frontend Hook Tests

### What's Tested

**useAuth Hook** (`hooks/__tests__/useAuth.test.ts`):
- Sign-in flow (valid/invalid credentials)
- Sign-up flow (account creation, email confirmation)
- Token management (getAuthToken, token refresh, sign-out)
- Error handling (network errors, invalid credentials)

**useGraphQL Hook** (`hooks/__tests__/useGraphQL.test.ts`):
- Mutation execution (success, errors, loading state)
- Query execution (success, errors, loading state)
- Optimistic updates (immediate update, rollback on failure)

**useSubscription Hook** (`hooks/__tests__/useSubscription.test.ts`):
- Subscription connection (establish, isSubscribed state, errors)
- Data handling (receive data, onData callback, state updates)
- Cleanup (unsubscribe on unmount, no state updates after unmount)
- Reconnection behavior

### Running Frontend Tests

```bash
# Run all frontend tests
npm run test:frontend

# Run specific test file
npm run test:frontend -- useAuth.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Coverage Results

Current frontend hook coverage:
- **useAuth**: 95.58% lines, 45.45% branches
- **useGraphQL**: 100% lines, 78.57% branches
- **useSubscription**: 54.05% lines, 44.44% branches

### Example Test

```typescript
describe('useAuth', () => {
  it('should sign in with valid credentials', async () => {
    // Mock Amplify Auth
    (signIn as jest.Mock).mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    });

    // Call sign in
    const result = await signInUser('test@example.com', 'password123');

    // Verify success
    expect(result.success).toBe(true);
    expect(signIn).toHaveBeenCalledWith({
      username: 'test@example.com',
      password: 'password123',
    });
  });
});
```

---

## End-to-End Tests

### What's Tested

**Multi-Device Sync** (`e2e/multi-device-sync.spec.ts`):
- Two users joining same room and seeing each other
- Story creation syncing across devices
- Vote casting and tally updates
- Vote reveal synchronization
- Latency measurements (<250ms for sync, <2s for tally)

**Auth Flow** (`e2e/auth-flow.spec.ts`):
- Sign-in with valid credentials
- Sign-in with invalid credentials showing error
- JWT token received after sign-in
- Sign-out clearing token

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test auth-flow.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

### Test Environment Setup

E2E tests require environment variables in `.env.test`:

```bash
# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_APPSYNC_ENDPOINT=https://XXXXXXXXXX.appsync-api.us-east-1.amazonaws.com/graphql
VITE_APPSYNC_REGION=us-east-1
VITE_APPSYNC_AUTH_TYPE=AMAZON_COGNITO_USER_POOLS

# Test User Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_USER_2_EMAIL=test2@example.com
TEST_USER_2_PASSWORD=TestPassword123!
```

### Creating Test Users

Before running E2E tests, create test users:

```bash
npm run create-test-users
```

This script creates two test users in Cognito for E2E testing.

### Cleaning Up Test Data

After running E2E tests, clean up test data:

```bash
npm run cleanup-test-data
```

This script removes test rooms, stories, and votes from DynamoDB.

### Example E2E Test

```typescript
test('two users join same room and see each other', async () => {
  // Create two browser contexts (simulating two devices)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // User 1 creates room
  await signInTestUser(page1, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  await page1.click('[data-testid="create-room"]');
  const roomCode = await page1.textContent('[data-testid="room-code"]');

  // User 2 joins room
  await signInTestUser(page2, TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD);
  await page2.fill('[data-testid="room-code-input"]', roomCode);
  await page2.click('[data-testid="join-room"]');

  // Verify both users see each other
  await expect(page1.locator('[data-testid="participant-list"]')).toContainText('User 2');
  await expect(page2.locator('[data-testid="participant-list"]')).toContainText('User 1');

  // Cleanup
  await context1.close();
  await context2.close();
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on every push and pull request via `.github/workflows/test.yml`.

**Workflow Steps**:
1. **Backend Unit Tests**: Run Jest tests for Lambda functions
2. **Frontend Unit Tests**: Run Jest tests for React hooks
3. **E2E Tests**: Run Playwright tests (only after unit tests pass)
4. **Coverage Reporting**: Upload coverage to Codecov
5. **Merge Blocking**: PR cannot merge if tests fail

### Viewing Test Results

**In GitHub**:
1. Go to the "Actions" tab in your repository
2. Click on the latest workflow run
3. View test results for each job
4. Download test artifacts (screenshots, videos) if tests fail

**Locally**:
```bash
# View Playwright HTML report
npx playwright show-report

# View Jest coverage report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

---

## Troubleshooting

### Backend Tests Failing

**Issue**: `Cannot find module '@aws-sdk/client-dynamodb'`

**Solution**: Install dependencies in infra folder
```bash
cd infra
npm install
cd ..
npm run test:backend
```

**Issue**: `aws-sdk-client-mock` not working

**Solution**: Ensure you're using the correct mock syntax
```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoMock = mockClient(DynamoDBClient);
dynamoMock.on(PutItemCommand).resolves({});
```

### Frontend Tests Failing

**Issue**: `Cannot find module 'aws-amplify'`

**Solution**: Install dependencies
```bash
npm install
npm run test:frontend
```

**Issue**: React Testing Library warnings

**Solution**: Wrap state updates in `act()`
```typescript
import { act } from '@testing-library/react';

await act(async () => {
  await signInUser('test@example.com', 'password');
});
```

### E2E Tests Failing

**Issue**: `Test user not found`

**Solution**: Create test users first
```bash
npm run create-test-users
npm run test:e2e
```

**Issue**: `Connection timeout`

**Solution**: Check that your AWS resources are deployed
```bash
cd infra
npm run deploy
cd ..
npm run test:e2e
```

**Issue**: `Element not found`

**Solution**: Add `data-testid` attributes to your components
```tsx
<button data-testid="create-room">Create Room</button>
```

---

## Best Practices

### Writing Tests

1. **Test Behavior, Not Implementation**
   ```typescript
   // ✅ Good: Test what the user sees
   expect(screen.getByText('Room created')).toBeInTheDocument();
   
   // ❌ Bad: Test internal state
   expect(component.state.roomCreated).toBe(true);
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // ✅ Good
   it('should show error message when sign-in fails with invalid credentials', () => {});
   
   // ❌ Bad
   it('test sign in', () => {});
   ```

3. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should calculate correct average', () => {
     // Arrange: Set up test data
     const votes = [5, 8, 13];
     
     // Act: Execute the function
     const result = calculateAverage(votes);
     
     // Assert: Verify the result
     expect(result).toBe(8.67);
   });
   ```

4. **Clean Up After Tests**
   ```typescript
   afterEach(async () => {
     // Clean up test data
     await cleanupTestData(roomId);
     
     // Reset mocks
     jest.clearAllMocks();
   });
   ```

### Maintaining Tests

1. **Keep Tests Fast**
   - Unit tests should run in <30 seconds
   - E2E tests should run in <5 minutes
   - Use mocks for external dependencies

2. **Keep Tests Independent**
   - Each test should be able to run in isolation
   - Don't rely on test execution order
   - Clean up after each test

3. **Update Tests with Code Changes**
   - When you change functionality, update tests
   - When tests fail, fix them immediately
   - Don't skip or disable failing tests

4. **Monitor Test Coverage**
   - Aim for 80% line coverage
   - Focus on critical paths first
   - Don't chase 100% coverage

---

## Performance Targets

### Test Execution Time

- **Backend Unit Tests**: <10 seconds
- **Frontend Unit Tests**: <15 seconds
- **E2E Tests**: <5 minutes
- **Total CI Pipeline**: <10 minutes

### Latency Assertions

E2E tests measure and assert these latencies:
- **Pub/Sub Sync**: <250ms (p95)
- **Vote Tally Update**: <2s (p95)
- **Presence Heartbeat**: 30s interval (±2s tolerance)

---

## Additional Resources

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro
- **Playwright Documentation**: https://playwright.dev/docs/intro
- **AWS SDK Client Mock**: https://github.com/m-radzikowski/aws-sdk-client-mock

---

## Support

If you encounter issues with the test suite:

1. Check this guide for troubleshooting steps
2. Review test logs in GitHub Actions
3. Run tests locally with `--verbose` flag
4. Check test coverage reports for gaps

---

**Document Version**: 1.0  
**Last Updated**: November 14, 2025  
**Status**: Production Ready
