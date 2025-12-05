# E2E Tests for Scrum Reborn

This directory contains end-to-end tests for the Scrum Reborn application using Playwright.

## Test Structure

### Test Files

- **`multi-device-sync.spec.ts`**: Tests for multi-device synchronization including:
  - Room join synchronization
  - Presence list updates
  - Story creation and editing
  - Voting flow and vote reveal
  
- **`auth-flow.spec.ts`**: Tests for authentication flow including:
  - Sign-in with valid/invalid credentials
  - JWT token management
  - Sign-out functionality
  - Session persistence

### Helper Modules

- **`helpers/auth.ts`**: Authentication helpers for signing in/out users and managing test users in Cognito
- **`helpers/metrics.ts`**: Performance measurement utilities for tracking latency and SLI compliance
- **`helpers/cleanup.ts`**: Test data cleanup functions for DynamoDB
- **`fixtures/test-users.ts`**: Test user credentials and configuration

## Prerequisites

### 1. Install Dependencies

```bash
npm install
npx playwright install --with-deps
```

### 2. Configure Environment Variables

Create or update `.env.test` with your test environment configuration:

```bash
# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_APPSYNC_ENDPOINT=https://XXXXXXXXXXXXXXXXXXXXXXXXXX.appsync-api.us-east-1.amazonaws.com/graphql
VITE_APPSYNC_REGION=us-east-1
VITE_APPSYNC_AUTH_TYPE=AMAZON_COGNITO_USER_POOLS

# Test User Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_USER_2_EMAIL=test2@example.com
TEST_USER_2_PASSWORD=TestPassword123!

# Application URL
APP_URL=http://localhost:5173

# DynamoDB Table (for cleanup)
DYNAMODB_TABLE_NAME=your-table-name
```

### 3. Create Test Users in Cognito

You can create test users manually in the AWS Cognito console, or use the helper function:

```typescript
import { createTestUser } from './helpers/auth';

await createTestUser('test@example.com', 'TestPassword123!', 'Test User 1');
await createTestUser('test2@example.com', 'TestPassword123!', 'Test User 2');
```

**Note**: Creating users programmatically requires AWS credentials with Cognito admin permissions.

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test e2e/multi-device-sync.spec.ts
npx playwright test e2e/auth-flow.spec.ts
```

### Run Tests in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests with Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Performance Metrics

The multi-device sync tests measure and report latency metrics against SLI targets:

- **Room join**: < 2s
- **Presence list update**: < 250ms
- **Story creation sync**: < 250ms
- **Story update sync**: < 250ms
- **Vote count update**: < 2s
- **Vote reveal sync**: < 250ms

Metrics are printed at the end of the test run in the console.

## Test Data Cleanup

Tests automatically clean up test data after execution. If you need to manually clean up:

```typescript
import { cleanupTestRoom } from './helpers/cleanup';

await cleanupTestRoom('ROOM-CODE-123');
```

## Troubleshooting

### Tests Fail with "User not found"

Make sure test users exist in Cognito with the correct credentials specified in `.env.test`.

### Tests Timeout

- Increase timeout in `playwright.config.ts`
- Check that the dev server is running (`npm run dev`)
- Verify AWS services (Cognito, AppSync, DynamoDB) are accessible

### Connection Issues

- Verify `.env.test` has correct AWS endpoints
- Check AWS credentials if using programmatic user creation
- Ensure network connectivity to AWS services

### Flaky Tests

Multi-device synchronization tests may occasionally fail due to network latency. The tests include:
- Retry logic (2 retries in CI)
- Generous timeouts with buffers
- Video recording on failure for debugging

## CI/CD Integration

Tests are configured to run in GitHub Actions. See `.github/workflows/test.yml` for the CI configuration.

In CI:
- Tests run with 2 retries
- Videos and screenshots are captured on failure
- Test results are uploaded as artifacts

## Best Practices

1. **Isolation**: Each test should be independent and not rely on state from other tests
2. **Cleanup**: Always clean up test data to avoid conflicts
3. **Timeouts**: Use appropriate timeouts for async operations
4. **Selectors**: Use data-testid attributes for stable selectors (to be added)
5. **Assertions**: Use Playwright's built-in assertions with auto-retry

## Future Improvements

- [ ] Add data-testid attributes to components for more stable selectors
- [ ] Implement visual regression testing
- [ ] Add performance benchmarking
- [ ] Create test data factories for complex scenarios
- [ ] Add accessibility testing with axe-core
