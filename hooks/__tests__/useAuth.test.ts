import { renderHook, act, waitFor } from '@testing-library/react';
import { mockAuthUser, mockAuthSession } from './mocks';

// Mock @aws-amplify/auth before importing the hook
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockFetchAuthSession = jest.fn();
const mockConfirmSignUp = jest.fn();

jest.mock('@aws-amplify/auth', () => ({
  signIn: mockSignIn,
  signUp: mockSignUp,
  signOut: mockSignOut,
  getCurrentUser: mockGetCurrentUser,
  fetchAuthSession: mockFetchAuthSession,
  confirmSignUp: mockConfirmSignUp,
}));

import { useAuth, generateUsername } from '../useAuth';

describe('generateUsername', () => {
  it('should generate username from email prefix', () => {
    const username = generateUsername('john@example.com');
    expect(username).toMatch(/^john-\d+$/);
  });

  it('should sanitize special characters', () => {
    const username = generateUsername('user+test@example.com');
    expect(username).toMatch(/^usertest-\d+$/);
  });

  it('should handle multiple special characters', () => {
    const username = generateUsername('user.name+tag@example.com');
    expect(username).toMatch(/^usernametag-\d+$/);
  });

  it('should preserve hyphens in email prefix', () => {
    const username = generateUsername('user-name@example.com');
    expect(username).toMatch(/^user-name-\d+$/);
  });

  it('should handle short email prefixes', () => {
    const username = generateUsername('a@b.com');
    expect(username).toMatch(/^a-\d+$/);
  });

  it('should handle single character prefix', () => {
    const username = generateUsername('x@example.com');
    expect(username).toMatch(/^x-\d+$/);
  });

  it('should use fallback for missing prefix', () => {
    const username = generateUsername('@example.com');
    expect(username).toMatch(/^user-\d+$/);
  });

  it('should use fallback for empty email', () => {
    const username = generateUsername('');
    expect(username).toMatch(/^user-\d+$/);
  });

  it('should truncate long email prefixes to 20 characters', () => {
    const longPrefix = 'verylongemailprefixthatexceedstwentycharacters@example.com';
    const username = generateUsername(longPrefix);
    const prefix = username.split('-')[0];
    expect(prefix.length).toBeLessThanOrEqual(20);
    expect(username).toMatch(/^verylongemailprefixt-\d+$/);
  });

  it('should generate unique usernames for consecutive calls', async () => {
    const username1 = generateUsername('test@example.com');
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 5));
    const username2 = generateUsername('test@example.com');
    expect(username1).not.toBe(username2);
  });

  it('should generate unique usernames with different timestamps', async () => {
    const username1 = generateUsername('test@example.com');
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 2));
    const username2 = generateUsername('test@example.com');
    
    const timestamp1 = username1.split('-')[1];
    const timestamp2 = username2.split('-')[1];
    expect(timestamp1).not.toBe(timestamp2);
  });

  it('should handle email with only special characters in prefix', () => {
    const username = generateUsername('+++@example.com');
    expect(username).toMatch(/^user-\d+$/);
  });

  it('should handle email with numbers in prefix', () => {
    const username = generateUsername('user123@example.com');
    expect(username).toMatch(/^user123-\d+$/);
  });

  it('should handle email with mixed case', () => {
    const username = generateUsername('JohnDoe@example.com');
    expect(username).toMatch(/^JohnDoe-\d+$/);
  });

  it('should ensure username is under 128 characters', () => {
    const longPrefix = 'a'.repeat(100) + '@example.com';
    const username = generateUsername(longPrefix);
    expect(username.length).toBeLessThan(128);
  });

  it('should contain only alphanumeric characters and hyphens', () => {
    const username = generateUsername('user.name+tag!test@example.com');
    expect(username).toMatch(/^[a-zA-Z0-9-]+$/);
  });

  it('should handle email with underscore', () => {
    const username = generateUsername('user_name@example.com');
    expect(username).toMatch(/^username-\d+$/);
  });
});

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sign In Flow', () => {
    it('should sign in with valid credentials', async () => {
      mockSignIn.mockResolvedValue({ isSignedIn: true });
      mockGetCurrentUser.mockResolvedValue(mockAuthUser);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signInUser('test@example.com', 'password123');
      });

      expect(mockSignIn).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockAuthUser);
      expect(result.current.error).toBeNull();
    });

    it('should handle invalid credentials', async () => {
      const error = new Error('Invalid credentials');
      mockGetCurrentUser.mockRejectedValue(new Error('No user'));
      mockSignIn.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      // Wait for initial check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.signInUser('test@example.com', 'wrongpassword');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Invalid credentials');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should extract userId from sign-in response', async () => {
      mockSignIn.mockResolvedValue({ isSignedIn: true });
      mockGetCurrentUser.mockResolvedValue({
        userId: 'user-456',
        username: 'newuser@example.com',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signInUser('newuser@example.com', 'password123');
      });

      expect(result.current.user?.userId).toBe('user-456');
      expect(result.current.user?.username).toBe('newuser@example.com');
    });
  });

  describe('Sign Up Flow', () => {
    it('should create new user account with generated username', async () => {
      mockSignUp.mockResolvedValue({});

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUpUser('newuser@example.com', 'password123', 'New User');
      });

      expect(mockSignUp).toHaveBeenCalledTimes(1);
      const callArgs = mockSignUp.mock.calls[0][0];
      
      // Verify username is generated (not email format)
      expect(callArgs.username).toMatch(/^newuser-\d+$/);
      expect(callArgs.username).not.toBe('newuser@example.com');
      
      // Verify other fields
      expect(callArgs.password).toBe('password123');
      expect(callArgs.options.userAttributes.email).toBe('newuser@example.com');
      expect(callArgs.options.userAttributes.name).toBe('New User');
    });

    it('should require email confirmation', async () => {
      mockSignUp.mockResolvedValue({});

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUpUser('newuser@example.com', 'password123', 'New User');
      });

      expect(result.current.error).toContain('check your email');
    });

    it('should retry on username collision and succeed', async () => {
      const collisionError = new Error('Username already exists');
      collisionError.name = 'UsernameExistsException';
      
      // First call fails with collision, second succeeds
      mockSignUp
        .mockRejectedValueOnce(collisionError)
        .mockResolvedValueOnce({});

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUpUser('collision@example.com', 'password123', 'User');
      });

      // Should have retried once
      expect(mockSignUp).toHaveBeenCalledTimes(2);
      expect(result.current.error).toContain('check your email');
    });

    it('should fail after max retries on username collision', async () => {
      const collisionError = new Error('Username already exists');
      collisionError.name = 'UsernameExistsException';
      
      // All attempts fail with collision
      mockSignUp.mockRejectedValue(collisionError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUpUser('collision@example.com', 'password123', 'User');
        } catch (err) {
          // Expected to throw
        }
      });

      // Should have tried 3 times (MAX_RETRIES)
      expect(mockSignUp).toHaveBeenCalledTimes(3);
      expect(result.current.error).toContain('technical issue');
    });

    it('should handle sign-up errors', async () => {
      const error = new Error('Email already exists');
      mockSignUp.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUpUser('existing@example.com', 'password123', 'User');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Email already exists');
    });

    it('should not retry on non-collision errors', async () => {
      const passwordError = new Error('Password does not meet requirements');
      passwordError.name = 'InvalidPasswordException';
      
      // Non-collision error should fail immediately without retries
      mockSignUp.mockRejectedValue(passwordError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUpUser('test@example.com', 'weak', 'User');
        } catch (err) {
          // Expected to throw
        }
      });

      // Should have tried only once (no retries for non-collision errors)
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBe('Password does not meet requirements');
    });
  });

  describe('Token Management', () => {
    it('should return valid JWT token', async () => {
      mockFetchAuthSession.mockResolvedValue(mockAuthSession);

      const { result } = renderHook(() => useAuth());

      let token: string | null = null;
      await act(async () => {
        token = await result.current.getAuthToken();
      });

      expect(token).toBe('mock-jwt-token');
      expect(mockFetchAuthSession).toHaveBeenCalled();
    });

    it('should handle token refresh', async () => {
      mockFetchAuthSession.mockResolvedValue(mockAuthSession);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.getAuthToken();
      });

      // Call again to simulate refresh
      await act(async () => {
        await result.current.getAuthToken();
      });

      expect(mockFetchAuthSession).toHaveBeenCalledTimes(2);
    });

    it('should clear token on sign out', async () => {
      mockSignIn.mockResolvedValue({ isSignedIn: true });
      mockGetCurrentUser.mockResolvedValue(mockAuthUser);
      mockSignOut.mockResolvedValue({});

      const { result } = renderHook(() => useAuth());

      // Sign in first
      await act(async () => {
        await result.current.signInUser('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Sign out
      await act(async () => {
        await result.current.signOutUser();
      });

      expect(mockSignOut).toHaveBeenCalledWith({ global: true });
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return null when token fetch fails', async () => {
      mockFetchAuthSession.mockRejectedValue(new Error('Session expired'));

      const { result } = renderHook(() => useAuth());

      let token: string | null = null;
      await act(async () => {
        token = await result.current.getAuthToken();
      });

      expect(token).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during sign-in', async () => {
      const networkError = new Error('Network request failed');
      mockSignIn.mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signInUser('test@example.com', 'password123');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Network request failed');
    });

    it('should clear error when clearError is called', async () => {
      mockSignIn.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signInUser('test@example.com', 'password123');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle confirm user errors', async () => {
      const error = new Error('Invalid confirmation code');
      mockConfirmSignUp.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.confirmUser('test@example.com', '123456');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Invalid confirmation code');
    });
  });

  describe('Initial Authentication Check', () => {
    it('should check for existing user on mount', async () => {
      mockGetCurrentUser.mockResolvedValue(mockAuthUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockAuthUser);
    });

    it('should handle no existing user on mount', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('No user'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});
