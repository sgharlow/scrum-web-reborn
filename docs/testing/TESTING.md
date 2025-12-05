# Testing Guide

This document provides comprehensive instructions for running and maintaining the automated test suite for Scrum Reborn.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests Locally](#running-tests-locally)
- [Test Environment Setup](#test-environment-setup)
- [CI/CD Integration](#cicd-integration)
- [Coverage Requirements](#coverage-requirements)
- [Troubleshooting](#troubleshooting)

## Overview

The Scrum Reborn test suite consists of three layers:

1. **Backend Unit Tests**: Test Lambda functions (mutations, tally) using Jest
2. **Frontend Unit Tests**: Test React hooks using Jest + React Testing Library
3. **E2E Tests**: Test multi-device synchronization using Playwright

### Test Pyramid

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

## Test Structure

```
scrum-reborn/
├── infra/lambda/
│   ├── mutations/__tests__/
│   │   └── mutations.test.ts
│   ├── tally/__tests__/
│   │   └── tally.test.ts
│   └── __tests__/
│       ├── fixtures.ts
│       └── mocks.ts
├── hooks/__tests__/
│   ├── useAuth.test.ts
│   ├── useGraphQL.test.ts
│   ├── useSubscription.test.ts
│   ├── mocks.ts
│   └── helpers.ts
├── e2e/
│   ├── auth-flow.spec.ts
│   ├── multi-device-sync.spec.ts
│   ├── helpers/
│   │   ├── auth.ts
│   │   ├── metrics.ts
│   │   └── cleanup.ts
│   └── fixtures/
│       └── test-users.ts
└── scripts/
    ├── create-test-users.ts
    └── cleanup-test-data.ts
```

## Running Tests Locally

### Prerequisites

1. **Node.js 20.x** or later
2. **npm** or **yarn**
3. **AWS credentials** configured (for E2E tests)
4. **Test environment** deployed (for E2E tests)

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm run test:all
```

This runs backend unit tests, frontend unit tests, and E2E tests sequentially.

### Run Specific Test Suites

**Backend Unit Tests**:
```bash
npm run test:backend
```

**Frontend Unit Tests**:
```bash
npm run test:frontend
```

**E2E Tests**:
```bash
npm run test:e2e
```

### Watch Mode (Development)

Run tests in watch mode for rapid feedback during development:

```bash
npm run test:watch
```

### Coverage Reports

Generate coverage reports:

```bash
# Frontend coverage
npm run test:coverage

# Backend coverage
npm run test:backend -- --coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Test Environment Setup

### 1. Configure Environment Variables

Copy the test environment template:

```bash
cp .env.test .env.test.local
```

Edit `.env.test.local` with your test environment values:

```env
# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_APPSYNC_ENDPOINT=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
VITE_APPSYNC_REGION=us-east-1
VITE_APPSYNC_AUTH_TYPE=AMAZON_COGNITO_USER_POOLS
VITE_TABLE_NAME=ScrumRealtimeStack-Table

# Test User Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_USER_2_EMAIL=test2@example.com
TEST_USER_2_PASSWORD=TestPassword123!

# Application URL
APP_URL=http://localhost:5173
```

### 2. Create Test Users

Create test users in Cognito:

```bash
# Load environment variables
export $(cat .env.test.local | xargs)

# Create test users
npm run create-test-users
```

This script:
- Creates two test users in your Cognito User Pool
- Sets permanent passwords (no email verification required)
- Skips users that already exist

### 3. Deploy Test Environment

If you don't have a test environment deployed:

```bash
cd infra
npm install
npm run build
cdk deploy
```

Save the stack outputs (GraphQL endpoint, User Pool ID, etc.) and add them to `.env.test.local`.

### 4. Verify Setup

Run a quick test to verify everything is configured:

```bash
npm run test:e2e -- auth-flow.spec.ts
```

## CI/CD Integration

### GitHub Actions Workflow

The test suite runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Workflow Jobs

1. **Backend Unit Tests**
   - Runs Jest tests for Lambda functions
   - Uploads coverage to Codecov
   - Artifacts: Coverage reports

2. **Frontend Unit Tests**
   - Runs Jest tests for React hooks
   - Uploads coverage to Codecov
   - Artifacts: Coverage reports

3. **E2E Tests** (runs after unit tests pass)
   - Installs Playwright browsers
   - Runs multi-device sync tests
   - Artifacts: Playwright reports, screenshots, videos

4. **Test Summary**
   - Downloads coverage reports
   - Generates summary in GitHub Actions UI

### Required GitHub Secrets

Configure these secrets in your repository (Settings → Secrets and variables → Actions):

**For E2E Tests**:
- `E2E_APP_URL`: URL of deployed test environment
- `VITE_AWS_REGION`: AWS region
- `VITE_USER_POOL_ID`: Cognito User Pool ID
- `VITE_USER_POOL_CLIENT_ID`: Cognito Client ID
- `VITE_APPSYNC_ENDPOINT`: AppSync GraphQL endpoint
- `VITE_APPSYNC_REGION`: AppSync region
- `VITE_APPSYNC_AUTH_TYPE`: `AMAZON_COGNITO_USER_POOLS`
- `TEST_USER_EMAIL`: Test user 1 email
- `TEST_USER_PASSWORD`: Test user 1 password
- `TEST_USER_2_EMAIL`: Test user 2 email
- `TEST_USER_2_PASSWORD`: Test user 2 password

**For Coverage Reporting** (optional):
- `CODECOV_TOKEN`: Codecov upload token

### Viewing Test Results

1. Go to **Actions** tab in GitHub
2. Click on the workflow run
3. View job logs and test summaries
4. Download artifacts (coverage reports, Playwright reports)

## Coverage Requirements

### Thresholds

The test suite enforces minimum coverage thresholds:

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Branches | 70% |
| Functions | 80% |
| Statements | 80% |

### Coverage Badges

Coverage badges are displayed in the README:

- Backend Coverage: Shows coverage for Lambda functions
- Frontend Coverage: Shows coverage for React hooks
- Test Suite: Shows CI/CD workflow status

Update badge URLs in `README.md` after setting up Codecov:

```markdown
[![Backend Coverage](https://codecov.io/gh/YOUR_ORG/scrum-reborn/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/YOUR_ORG/scrum-reborn)
[![Frontend Coverage](https://codecov.io/gh/YOUR_ORG/scrum-reborn/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/YOUR_ORG/scrum-reborn)
```

### Codecov Setup

1. Sign up at [codecov.io](https://codecov.io)
2. Connect your GitHub repository
3. Copy the upload token
4. Add `CODECOV_TOKEN` to GitHub Secrets
5. Coverage reports upload automatically on CI runs

## Troubleshooting

### Unit Tests Fail Locally

**Issue**: Tests pass in CI but fail locally

**Solutions**:
1. Clear Jest cache: `npx jest --clearCache`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check Node.js version: `node --version` (should be 20.x)
4. Verify no conflicting global packages

### E2E Tests Timeout

**Issue**: E2E tests timeout or hang

**Solutions**:
1. Increase timeout in `playwright.config.ts`:
   ```typescript
   use: {
     timeout: 30000, // 30 seconds per action
   }
   ```
2. Check network connectivity to AWS
3. Verify test users exist in Cognito
4. Check CloudWatch logs for Lambda errors
5. Run with debug output: `DEBUG=pw:api npm run test:e2e`

### Authentication Errors in E2E Tests

**Issue**: "User is not authenticated" or "Invalid credentials"

**Solutions**:
1. Verify test users exist: `npm run create-test-users`
2. Check passwords meet Cognito requirements (min 8 chars, 1 digit)
3. Confirm User Pool ID and Client ID are correct
4. Check Cognito User Pool settings (password policy, MFA)
5. Try signing in manually with test credentials

### Coverage Below Threshold

**Issue**: CI fails due to coverage below 80%/70%

**Solutions**:
1. Identify uncovered code: `npm run test:coverage`
2. Add tests for uncovered branches
3. Remove dead code
4. Update coverage thresholds if justified (requires team approval)

### DynamoDB Access Errors

**Issue**: E2E tests fail with "AccessDeniedException"

**Solutions**:
1. Verify AWS credentials are configured: `aws sts get-caller-identity`
2. Check IAM permissions for DynamoDB access
3. Confirm table name is correct in `.env.test.local`
4. Verify table exists: `aws dynamodb describe-table --table-name ScrumRealtimeStack-Table`

### Playwright Browser Installation

**Issue**: "Executable doesn't exist" error

**Solutions**:
1. Install browsers: `npx playwright install`
2. Install system dependencies: `npx playwright install-deps`
3. On CI, use `npx playwright install --with-deps chromium`

### Test Data Cleanup

**Issue**: Old test data interferes with tests

**Solutions**:
1. Run cleanup script: `npm run cleanup-test-data`
2. Clean specific room: `npm run cleanup-test-data ROOM_ID`
3. Dry run first: `npm run cleanup-test-data -- --dry-run`
4. Add cleanup to E2E test teardown

## Best Practices

### Writing Tests

1. **Focus on behavior, not implementation**
   - Test what the code does, not how it does it
   - Avoid testing internal implementation details

2. **Use descriptive test names**
   ```typescript
   // ✅ Good
   it('should calculate correct average for numeric votes')
   
   // ❌ Bad
   it('test1')
   ```

3. **Arrange-Act-Assert pattern**
   ```typescript
   it('should create room with valid code', async () => {
     // Arrange
     const input = { name: 'Test Room' };
     
     // Act
     const result = await createRoom(input);
     
     // Assert
     expect(result.code).toMatch(/^[A-Z0-9]{6}$/);
   });
   ```

4. **Keep tests independent**
   - Each test should run in isolation
   - Don't rely on test execution order
   - Clean up after each test

5. **Mock external dependencies**
   - Mock AWS SDK calls in unit tests
   - Use real services only in E2E tests

### Maintaining Tests

1. **Update tests when requirements change**
2. **Remove obsolete tests**
3. **Refactor tests along with code**
4. **Keep test data fixtures up to date**
5. **Document complex test scenarios**

### Performance

1. **Run unit tests frequently** (fast feedback)
2. **Run E2E tests before commits** (catch integration issues)
3. **Use watch mode during development**
4. **Parallelize tests when possible**
5. **Keep E2E tests focused** (test critical paths only)

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [E2E Testing Plan](docs/guides/E2E-TESTING-PLAN.md)
- [Testing Status Report](TESTING-STATUS-REPORT.md)

## Support

If you encounter issues not covered in this guide:

1. Check [GitHub Issues](https://github.com/your-repo/issues)
2. Review [E2E README](e2e/README.md)
3. Ask in team Slack channel
4. Open a new issue with:
   - Test command that failed
   - Error message
   - Environment details (OS, Node version)
   - Steps to reproduce

---

**Last Updated**: 2025-11-14  
**Maintained By**: Scrum Reborn Team
