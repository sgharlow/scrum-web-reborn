import { useState, useEffect, useCallback } from 'react';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, confirmSignUp, resendSignUpCode, fetchUserAttributes, type SignInInput, type SignUpInput } from '@aws-amplify/auth';

export interface AuthUser {
  userId: string;
  email?: string;
  username: string;
  displayName?: string;  // The name they provided during signup
}

/**
 * Generates a unique username from an email address that complies with Cognito requirements.
 * Format: usr_{sanitized-prefix}_{timestamp}
 *
 * IMPORTANT: Uses "usr_" prefix to ensure username does NOT look like an email address.
 * This is required because Cognito User Pool has email alias enabled.
 *
 * @param email - The email address to generate a username from
 * @returns A unique username in the format: usr_prefix_timestamp (e.g., "usr_john_1731686400123")
 *
 * Requirements:
 * - Alphanumeric characters and underscores only (no @ or .)
 * - Maximum 128 characters (Cognito limit)
 * - Unique across concurrent sign-ups
 * - Must NOT look like an email address
 *
 * Edge cases handled:
 * - Special characters: user+test@example.com → usr_usertest_1731686400123
 * - Short emails: a@b.com → usr_a_1731686400123
 * - Missing prefix: @example.com → usr_user_1731686400123
 * - Long prefixes: Truncated to 20 chars
 */
export function generateUsername(email: string): string {
  // Extract prefix before @
  const prefix = email.split('@')[0] || '';

  // Sanitize: remove non-alphanumeric characters (including dots, hyphens, etc.)
  // This ensures the username looks nothing like an email
  const sanitized = prefix.replace(/[^a-zA-Z0-9]/g, '');

  // Ensure minimum length with fallback, truncate to 20 chars to stay under 128 char limit
  // (4 chars "usr_" + 20 chars prefix + 1 underscore + ~13 chars timestamp = ~38 chars total)
  const safePrefix = sanitized.slice(0, 20) || 'user';

  // Add timestamp for uniqueness guarantee
  const timestamp = Date.now();

  // Format: usr_prefix_timestamp (clearly NOT an email format)
  return `usr_${safePrefix}_${timestamp}`;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signInUser: (email: string, password: string) => Promise<void>;
  signUpUser: (email: string, password: string, name: string) => Promise<void>;
  confirmUser: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Store the generated username for confirmation (since Cognito needs exact username)
  const [pendingUsername, setPendingUsername] = useState<string | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();

      // Fetch user attributes to get email and name
      let email: string | undefined;
      let displayName: string | undefined;
      try {
        const attributes = await fetchUserAttributes();
        email = attributes.email;
        displayName = attributes.name;
      } catch (attrErr) {
        console.warn('Could not fetch user attributes:', attrErr);
      }

      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
        email,
        displayName,
      });
    } catch (err) {
      // User not authenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signInUser = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const signInInput: SignInInput = {
        username: email,
        password,
      };
      
      const { isSignedIn } = await signIn(signInInput);
      
      if (isSignedIn) {
        await checkUser();
      }
    } catch (err: any) {
      console.error('Sign in error:', err);

      let errorMessage = 'Failed to sign in. Please check your credentials.';
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUpUser = useCallback(async (email: string, password: string, name: string) => {
    const MAX_RETRIES = 3;
    let lastError: any = null;

    try {
      setError(null);
      setIsLoading(true);

      // Retry loop for username collision handling
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const username = generateUsername(email);
          const signUpInput: SignUpInput = {
            username,
            password,
            options: {
              userAttributes: {
                email,
                name,
              },
            },
          };

          await signUp(signUpInput);

          // Success - Store username for confirmation
          setPendingUsername(username);
          setError('Please check your email for a confirmation code.');
          return;
          
        } catch (err: any) {
          lastError = err;
          
          // Check if this is a username collision error
          if (err.name === 'UsernameExistsException' && attempt < MAX_RETRIES) {
            // Log collision event for monitoring
            console.warn(`Username collision detected on attempt ${attempt}/${MAX_RETRIES}. Retrying with new timestamp...`, {
              email,
              attempt,
              error: err.message,
            });
            
            // Continue to next retry attempt with new timestamp
            continue;
          }
          
          // If not a collision error, or we've exhausted retries, break out
          break;
        }
      }
      
      // If we get here, all retries failed
      console.error('Sign up error after retries:', lastError);

      // Display user-friendly error message
      let errorMessage = 'Failed to sign up. Please try again.';

      if (lastError?.name === 'UsernameExistsException') {
        errorMessage = 'Unable to create account due to a technical issue. Please try again in a moment.';
      } else if (lastError?.message) {
        errorMessage = lastError.message;
      } else if (typeof lastError === 'string') {
        errorMessage = lastError;
      } else if (lastError?.toString && lastError.toString() !== '[object Object]') {
        errorMessage = lastError.toString();
      }

      setError(errorMessage);
      throw lastError;
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmUser = useCallback(async (email: string, code: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // Use the stored username from sign-up, or fall back to email
      const username = pendingUsername || email;

      await confirmSignUp({
        username,
        confirmationCode: code,
      });

      // Clear pending username after successful confirmation
      setPendingUsername(null);
      setError('Account confirmed! You can now sign in.');
    } catch (err: any) {
      console.error('Confirm error:', err);

      let errorMessage = 'Failed to confirm account. Please try again.';

      if (err.name === 'ExpiredCodeException') {
        errorMessage = 'Code has expired. Please click "Resend Code" to get a new one.';
      } else if (err.name === 'CodeMismatchException') {
        errorMessage = 'Invalid code. Please check the code and try again.';
      } else if (err.name === 'AliasExistsException') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [pendingUsername]);

  const resendCode = useCallback(async (email: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // Use the stored username from sign-up, or fall back to email
      const username = pendingUsername || email;

      await resendSignUpCode({
        username,
      });

      setError('A new confirmation code has been sent to your email.');
    } catch (err: any) {
      console.error('Resend code error:', err);

      let errorMessage = 'Failed to resend code. Please try again.';

      if (err.name === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [pendingUsername]);

  const signOutUser = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      await signOut({ global: true });
      setUser(null);
      console.log('Successfully signed out');
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (err) {
      console.error('Failed to get auth token:', err);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    signInUser,
    signUpUser,
    confirmUser,
    resendCode,
    signOutUser,
    getAuthToken,
    clearError,
  };
};
