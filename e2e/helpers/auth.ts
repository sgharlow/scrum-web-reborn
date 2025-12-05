import { Page } from '@playwright/test';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

/**
 * Sign in a test user through the UI
 */
export async function signInTestUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  
  // Wait for auth form to load
  await page.waitForSelector('#email', { timeout: 10000 });
  
  // Fill in credentials
  await page.fill('#email', email);
  await page.fill('#password', password);
  
  // Click sign in button
  await page.click('button[type="submit"]:has-text("Sign In")');
  
  // Wait for successful authentication (dashboard or main app loads)
  // Adjust selector based on your app's post-auth UI
  await page.waitForLoadState('networkidle');
}

/**
 * Create a test user in Cognito (requires AWS credentials and admin permissions)
 */
export async function createTestUser(email: string, password: string, name: string = 'Test User'): Promise<void> {
  const userPoolId = process.env.VITE_USER_POOL_ID;
  
  if (!userPoolId) {
    throw new Error('VITE_USER_POOL_ID environment variable is required');
  }
  
  const cognito = new CognitoIdentityProviderClient({
    region: process.env.VITE_AWS_REGION || 'us-east-1',
  });
  
  try {
    // Create user
    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
      ],
      MessageAction: 'SUPPRESS', // Don't send welcome email
    }));
    
    // Set permanent password
    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    }));
    
    console.log(`✓ Created test user: ${email}`);
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      console.log(`Test user already exists: ${email}`);
    } else {
      throw error;
    }
  }
}

/**
 * Delete a test user from Cognito
 */
export async function deleteTestUser(email: string): Promise<void> {
  const userPoolId = process.env.VITE_USER_POOL_ID;
  
  if (!userPoolId) {
    throw new Error('VITE_USER_POOL_ID environment variable is required');
  }
  
  const cognito = new CognitoIdentityProviderClient({
    region: process.env.VITE_AWS_REGION || 'us-east-1',
  });
  
  try {
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    }));
    console.log(`✓ Deleted test user: ${email}`);
  } catch (error: any) {
    if (error.name === 'UserNotFoundException') {
      console.log(`Test user not found: ${email}`);
    } else {
      console.error(`Failed to delete test user ${email}:`, error);
    }
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(page: Page): Promise<void> {
  // Look for sign out button/link - adjust selector based on your UI
  const signOutButton = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();
  
  if (await signOutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await signOutButton.click();
    await page.waitForURL('/', { timeout: 5000 });
  }
}

/**
 * Check if user is authenticated by looking for auth-specific UI elements
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check if we're on the auth page (has email input)
  const emailInput = page.locator('#email');
  const isOnAuthPage = await emailInput.isVisible({ timeout: 1000 }).catch(() => false);
  
  return !isOnAuthPage;
}
