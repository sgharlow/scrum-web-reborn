#!/usr/bin/env node
/**
 * Create Test Users Script
 * 
 * Creates test users in Cognito for E2E testing.
 * Usage: npm run create-test-users
 */

import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID = process.env.VITE_USER_POOL_ID;
const AWS_REGION = process.env.VITE_AWS_REGION || 'us-east-1';

if (!USER_POOL_ID) {
  console.error('Error: VITE_USER_POOL_ID environment variable is required');
  process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({ region: AWS_REGION });

interface TestUser {
  email: string;
  password: string;
  displayName: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    displayName: 'Test User 1',
  },
  {
    email: process.env.TEST_USER_2_EMAIL || 'test2@example.com',
    password: process.env.TEST_USER_2_PASSWORD || 'TestPassword123!',
    displayName: 'Test User 2',
  },
];

async function userExists(email: string): Promise<boolean> {
  try {
    await cognito.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'UserNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTestUser(user: TestUser): Promise<void> {
  console.log(`Creating user: ${user.email}`);

  // Check if user already exists
  if (await userExists(user.email)) {
    console.log(`  ✓ User already exists: ${user.email}`);
    return;
  }

  try {
    // Create user
    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.email,
      UserAttributes: [
        {
          Name: 'email',
          Value: user.email,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
        {
          Name: 'name',
          Value: user.displayName,
        },
      ],
      MessageAction: 'SUPPRESS', // Don't send welcome email
      TemporaryPassword: user.password,
    }));

    // Set permanent password
    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.email,
      Password: user.password,
      Permanent: true,
    }));

    console.log(`  ✓ Created user: ${user.email}`);
  } catch (error: any) {
    console.error(`  ✗ Failed to create user ${user.email}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('Create Test Users Script');
  console.log('========================\n');
  console.log(`User Pool ID: ${USER_POOL_ID}`);
  console.log(`Region: ${AWS_REGION}\n`);

  try {
    for (const user of TEST_USERS) {
      await createTestUser(user);
    }
    
    console.log('\n✓ All test users created successfully.');
    console.log('\nTest users:');
    TEST_USERS.forEach(user => {
      console.log(`  - ${user.email} / ${user.password}`);
    });
  } catch (error) {
    console.error('\n✗ Error creating test users:', error);
    process.exit(1);
  }
}

main();
