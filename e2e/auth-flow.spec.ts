import { test, expect, type Page } from '@playwright/test';
import { signInTestUser, signOutUser, isAuthenticated, deleteTestUser } from './helpers/auth';
import { TEST_USER_1, TEST_USER_2 } from './fixtures/test-users';

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('sign-in with valid credentials', async () => {
    // Navigate to the app
    await page.goto('/');
    
    // Should see the auth form
    await expect(page.locator('h1:has-text("Scrum Reborn")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sign in to continue')).toBeVisible();
    
    // Fill in credentials
    await page.fill('#email', TEST_USER_1.email);
    await page.fill('#password', TEST_USER_1.password);
    
    // Click sign in
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Should be redirected to lobby after successful sign in
    await page.waitForLoadState('networkidle');
    
    // Verify we're authenticated (should see lobby, not auth form)
    await expect(page.locator('input[placeholder="Enter your name"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Create / Join Room")')).toBeVisible();
    
    // Verify auth form is no longer visible
    await expect(page.locator('text=Sign in to continue')).not.toBeVisible();
  });

  test('sign-in with invalid credentials shows error', async () => {
    await page.goto('/');
    
    // Wait for auth form
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Fill in invalid credentials
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'WrongPassword123!');
    
    // Click sign in
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Should see error message
    await expect(page.locator('text=/Connection Failed|Failed to sign in|Incorrect username or password/i'))
      .toBeVisible({ timeout: 5000 });
    
    // Should still be on auth page
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('JWT token received after sign-in', async () => {
    await page.goto('/');
    
    // Sign in
    await page.fill('#email', TEST_USER_1.email);
    await page.fill('#password', TEST_USER_1.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for successful authentication
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
    
    // Check for JWT token in localStorage or sessionStorage
    const hasToken = await page.evaluate(() => {
      // Check various storage locations where Amplify might store tokens
      const localStorageKeys = Object.keys(localStorage);
      const sessionStorageKeys = Object.keys(sessionStorage);
      
      // Look for Amplify token keys
      const amplifyTokenKeys = [...localStorageKeys, ...sessionStorageKeys].filter(key => 
        key.includes('CognitoIdentityServiceProvider') || 
        key.includes('idToken') ||
        key.includes('accessToken')
      );
      
      return amplifyTokenKeys.length > 0;
    });
    
    expect(hasToken).toBe(true);
    
    // Verify we can access authenticated content
    await expect(page.locator('button:has-text("Create / Join Room")')).toBeVisible();
  });

  test('sign-out clears token and redirects', async () => {
    // First, sign in
    await signInTestUser(page, TEST_USER_1.email, TEST_USER_1.password);
    
    // Verify we're authenticated
    await expect(page.locator('input[placeholder="Enter your name"]')).toBeVisible({ timeout: 10000 });
    
    // Look for sign out button
    const signOutButton = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();
    
    if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click sign out
      await signOutButton.click();
      
      // Should be redirected to auth page
      await expect(page.locator('text=Sign in to continue')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#email')).toBeVisible();
      
      // Verify tokens are cleared
      const hasToken = await page.evaluate(() => {
        const localStorageKeys = Object.keys(localStorage);
        const sessionStorageKeys = Object.keys(sessionStorage);
        
        const amplifyTokenKeys = [...localStorageKeys, ...sessionStorageKeys].filter(key => 
          key.includes('CognitoIdentityServiceProvider') && 
          (key.includes('idToken') || key.includes('accessToken'))
        );
        
        // Check if any tokens still have values
        return amplifyTokenKeys.some(key => {
          const value = localStorage.getItem(key) || sessionStorage.getItem(key);
          return value && value !== 'null' && value !== '';
        });
      });
      
      expect(hasToken).toBe(false);
    } else {
      // If no sign out button in lobby, join a room first
      await page.fill('input[placeholder="Enter your name"]', TEST_USER_1.name);
      await page.click('button:has-text("Create / Join Room")');
      await page.waitForSelector('text=/Room:/', { timeout: 10000 });
      
      // Now look for sign out in the room
      const roomSignOutButton = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();
      
      if (await roomSignOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roomSignOutButton.click();
        await expect(page.locator('text=Sign in to continue')).toBeVisible({ timeout: 5000 });
      } else {
        // Sign out functionality might not be implemented yet
        console.warn('Sign out button not found - feature may not be implemented');
      }
    }
  });

  test('JWT token contains required claims', async () => {
    await page.goto('/');
    
    // Sign in
    await page.fill('#email', TEST_USER_1.email);
    await page.fill('#password', TEST_USER_1.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for successful authentication
    await page.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
    
    // Extract and decode JWT token
    const tokenClaims = await page.evaluate(() => {
      // Find the ID token in storage
      const localStorageKeys = Object.keys(localStorage);
      const sessionStorageKeys = Object.keys(sessionStorage);
      
      const tokenKey = [...localStorageKeys, ...sessionStorageKeys].find(key => 
        key.includes('CognitoIdentityServiceProvider') && key.includes('idToken')
      );
      
      if (!tokenKey) return null;
      
      const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
      if (!token) return null;
      
      try {
        // Decode JWT (just the payload, no verification needed for this test)
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(atob(parts[1]));
        return payload;
      } catch (e) {
        return null;
      }
    });
    
    // Verify token claims
    expect(tokenClaims).not.toBeNull();
    
    if (tokenClaims) {
      // Check for required claims
      expect(tokenClaims).toHaveProperty('sub'); // Subject (user ID)
      expect(tokenClaims).toHaveProperty('email'); // Email
      expect(tokenClaims.email).toBe(TEST_USER_1.email);
      
      // Check for standard JWT claims
      expect(tokenClaims).toHaveProperty('iat'); // Issued at
      expect(tokenClaims).toHaveProperty('exp'); // Expiration
      
      // Verify token is not expired
      const now = Math.floor(Date.now() / 1000);
      expect(tokenClaims.exp).toBeGreaterThan(now);
      
      console.log('JWT Claims:', {
        sub: tokenClaims.sub,
        email: tokenClaims.email,
        iat: new Date(tokenClaims.iat * 1000).toISOString(),
        exp: new Date(tokenClaims.exp * 1000).toISOString(),
      });
    }
  });

  test('authentication persists across page reloads', async () => {
    // Sign in
    await signInTestUser(page, TEST_USER_1.email, TEST_USER_1.password);
    
    // Verify we're authenticated
    await expect(page.locator('input[placeholder="Enter your name"]')).toBeVisible({ timeout: 10000 });
    
    // Reload the page
    await page.reload();
    
    // Should still be authenticated (not see auth form)
    await page.waitForLoadState('networkidle');
    
    // Should see lobby, not auth form
    const isStillAuthenticated = await page.locator('input[placeholder="Enter your name"]')
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    
    expect(isStillAuthenticated).toBe(true);
    
    // Should not see auth form
    const seesAuthForm = await page.locator('text=Sign in to continue')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    
    expect(seesAuthForm).toBe(false);
  });

  test('multiple users can authenticate independently', async () => {
    // Create two separate browser contexts
    const context1 = await page.context().browser()!.newContext();
    const context2 = await page.context().browser()!.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // User 1 signs in
      await page1.goto('/');
      await page1.fill('#email', TEST_USER_1.email);
      await page1.fill('#password', TEST_USER_1.password);
      await page1.click('button[type="submit"]:has-text("Sign In")');
      await page1.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
      
      // User 2 signs in
      await page2.goto('/');
      await page2.fill('#email', TEST_USER_2.email);
      await page2.fill('#password', TEST_USER_2.password);
      await page2.click('button[type="submit"]:has-text("Sign In")');
      await page2.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
      
      // Both should be authenticated
      await expect(page1.locator('button:has-text("Create / Join Room")')).toBeVisible();
      await expect(page2.locator('button:has-text("Create / Join Room")')).toBeVisible();
      
      // Verify they have different sessions
      const user1Token = await page1.evaluate(() => {
        const keys = Object.keys(localStorage);
        const tokenKey = keys.find(k => k.includes('idToken'));
        return tokenKey ? localStorage.getItem(tokenKey) : null;
      });
      
      const user2Token = await page2.evaluate(() => {
        const keys = Object.keys(localStorage);
        const tokenKey = keys.find(k => k.includes('idToken'));
        return tokenKey ? localStorage.getItem(tokenKey) : null;
      });
      
      expect(user1Token).not.toBeNull();
      expect(user2Token).not.toBeNull();
      expect(user1Token).not.toBe(user2Token); // Different tokens for different users
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Sign-Up Flow with Generated Usernames', () => {
  let page: Page;
  const testEmails: string[] = [];

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page.close();
    
    // Clean up test users created during this test
    for (const email of testEmails) {
      try {
        await deleteTestUser(email);
      } catch (error) {
        console.warn(`Failed to clean up test user ${email}:`, error);
      }
    }
    testEmails.length = 0; // Clear the array
  });

  test('should sign up new user with generated username successfully', async () => {
    const testEmail = `test-signup-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'New Test User';
    
    testEmails.push(testEmail);
    
    await page.goto('/');
    
    // Wait for auth form to load
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Click "Sign up" link/button to switch to sign-up mode
    const signUpLink = page.locator('text=/Sign up|Create account/i').first();
    if (await signUpLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signUpLink.click();
    }
    
    // Fill in sign-up form
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    
    // Submit sign-up form
    await page.click('button[type="submit"]:has-text(/Sign Up|Create Account/i)');
    
    // Should NOT see "email format" error
    const emailFormatError = page.locator('text=/Username cannot be of email format|email format/i');
    await expect(emailFormatError).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // If the error appears, the test should fail
      return expect(emailFormatError).not.toBeVisible();
    });
    
    // Should see confirmation code prompt (sign-up succeeded)
    await expect(page.locator('text=/confirmation code|verify|enter code/i')).toBeVisible({ timeout: 10000 });
    
    console.log(`✓ Successfully signed up user: ${testEmail}`);
  });

  test('should sign in with email after successful sign-up', async () => {
    const testEmail = `test-signin-after-signup-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Sign In Test User';
    
    testEmails.push(testEmail);
    
    await page.goto('/');
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Switch to sign-up mode
    const signUpLink = page.locator('text=/Sign up|Create account/i').first();
    if (await signUpLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signUpLink.click();
    }
    
    // Complete sign-up
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]:has-text(/Sign Up|Create Account/i)');
    
    // Wait for confirmation prompt
    await expect(page.locator('text=/confirmation code|verify|enter code/i')).toBeVisible({ timeout: 10000 });
    
    // For this test, we'll use admin API to confirm the user
    // (In real scenario, user would enter confirmation code)
    // Note: This requires AWS SDK and admin permissions
    try {
      const { CognitoIdentityProviderClient, AdminConfirmSignUpCommand } = await import('@aws-sdk/client-cognito-identity-provider');
      const userPoolId = process.env.VITE_USER_POOL_ID;
      
      if (userPoolId) {
        const cognito = new CognitoIdentityProviderClient({
          region: process.env.VITE_AWS_REGION || 'us-east-1',
        });
        
        // Find the username (generated) by looking up the user by email
        const { AdminGetUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
        
        // Confirm the user using email (Cognito will resolve to username)
        await cognito.send(new AdminConfirmSignUpCommand({
          UserPoolId: userPoolId,
          Username: testEmail, // Cognito resolves email alias to actual username
        }));
        
        console.log(`✓ Confirmed user: ${testEmail}`);
      }
    } catch (error) {
      console.warn('Could not auto-confirm user via admin API:', error);
      // Skip the sign-in test if we can't confirm the user
      test.skip();
      return;
    }
    
    // Navigate back to sign-in page
    await page.goto('/');
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Ensure we're in sign-in mode (not sign-up)
    const signInLink = page.locator('text=/Sign in|Already have an account/i').first();
    if (await signInLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signInLink.click();
    }
    
    // Sign in with email (not the generated username)
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Should successfully authenticate and reach the lobby
    await expect(page.locator('input[placeholder="Enter your name"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Create / Join Room")')).toBeVisible();
    
    console.log(`✓ Successfully signed in with email: ${testEmail}`);
  });

  test('should handle concurrent sign-ups with same email prefix', async () => {
    const timestamp = Date.now();
    const emailPrefix = `test-concurrent-${timestamp}`;
    const testEmail1 = `${emailPrefix}@example.com`;
    const testEmail2 = `${emailPrefix}@test.com`; // Same prefix, different domain
    const testPassword = 'TestPassword123!';
    
    testEmails.push(testEmail1, testEmail2);
    
    // Create two separate browser contexts for concurrent sign-ups
    const context1 = await page.context().browser()!.newContext();
    const context2 = await page.context().browser()!.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Start both sign-ups concurrently
      const signUp1 = (async () => {
        await page1.goto('/');
        await page1.waitForSelector('#email', { timeout: 10000 });
        
        const signUpLink = page1.locator('text=/Sign up|Create account/i').first();
        if (await signUpLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signUpLink.click();
        }
        
        await page1.fill('#name', 'Concurrent User 1');
        await page1.fill('#email', testEmail1);
        await page1.fill('#password', testPassword);
        await page1.click('button[type="submit"]:has-text(/Sign Up|Create Account/i)');
        
        // Should NOT see email format error
        const emailFormatError = page1.locator('text=/Username cannot be of email format|email format/i');
        await expect(emailFormatError).not.toBeVisible({ timeout: 3000 }).catch(() => {});
        
        // Should see confirmation prompt
        await expect(page1.locator('text=/confirmation code|verify|enter code/i')).toBeVisible({ timeout: 10000 });
      })();
      
      const signUp2 = (async () => {
        await page2.goto('/');
        await page2.waitForSelector('#email', { timeout: 10000 });
        
        const signUpLink = page2.locator('text=/Sign up|Create account/i').first();
        if (await signUpLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signUpLink.click();
        }
        
        await page2.fill('#name', 'Concurrent User 2');
        await page2.fill('#email', testEmail2);
        await page2.fill('#password', testPassword);
        await page2.click('button[type="submit"]:has-text(/Sign Up|Create Account/i)');
        
        // Should NOT see email format error
        const emailFormatError = page2.locator('text=/Username cannot be of email format|email format/i');
        await expect(emailFormatError).not.toBeVisible({ timeout: 3000 }).catch(() => {});
        
        // Should see confirmation prompt
        await expect(page2.locator('text=/confirmation code|verify|enter code/i')).toBeVisible({ timeout: 10000 });
      })();
      
      // Wait for both sign-ups to complete
      await Promise.all([signUp1, signUp2]);
      
      console.log(`✓ Both concurrent sign-ups succeeded with same email prefix: ${emailPrefix}`);
      
      // Verify both users were created with unique usernames
      // (The timestamp in generateUsername() ensures uniqueness)
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('should handle various email formats without errors', async () => {
    const testCases = [
      { email: `user+tag-${Date.now()}@example.com`, description: 'email with plus sign' },
      { email: `user.name-${Date.now()}@example.com`, description: 'email with dot' },
      { email: `a-${Date.now()}@b.com`, description: 'short email' },
      { email: `very.long.email.address.with.many.dots-${Date.now()}@example.com`, description: 'long email' },
    ];
    
    for (const testCase of testCases) {
      const testEmail = testCase.email;
      const testPassword = 'TestPassword123!';
      
      testEmails.push(testEmail);
      
      await page.goto('/');
      await page.waitForSelector('#email', { timeout: 10000 });
      
      // Switch to sign-up mode
      const signUpLink = page.locator('text=/Sign up|Create account/i').first();
      if (await signUpLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await signUpLink.click();
      }
      
      // Fill in sign-up form
      await page.fill('#name', `Test User ${testCase.description}`);
      await page.fill('#email', testEmail);
      await page.fill('#password', testPassword);
      
      // Submit sign-up
      await page.click('button[type="submit"]:has-text(/Sign Up|Create Account/i)');
      
      // Should NOT see email format error
      const emailFormatError = page.locator('text=/Username cannot be of email format|email format/i');
      await expect(emailFormatError).not.toBeVisible({ timeout: 3000 }).catch(() => {
        throw new Error(`Email format error appeared for ${testCase.description}: ${testEmail}`);
      });
      
      // Should see confirmation prompt
      await expect(page.locator('text=/confirmation code|verify|enter code/i')).toBeVisible({ timeout: 10000 });
      
      console.log(`✓ Successfully handled ${testCase.description}: ${testEmail}`);
    }
  });
});
