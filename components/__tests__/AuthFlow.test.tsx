/**
 * Unit tests for AuthFlow component
 * Tests sign-in, sign-up, and confirmation flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthFlow from '../AuthFlow';
import * as useAuthModule from '../../hooks/useAuth';

// Mock the useAuth hook
jest.mock('../../hooks/useAuth');

describe('AuthFlow Component', () => {
  const mockSignInUser = jest.fn();
  const mockSignUpUser = jest.fn();
  const mockConfirmUser = jest.fn();
  const mockClearError = jest.fn();
  const mockOnAuthSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    (useAuthModule.useAuth as jest.Mock).mockReturnValue({
      signInUser: mockSignInUser,
      signUpUser: mockSignUpUser,
      confirmUser: mockConfirmUser,
      clearError: mockClearError,
      error: null,
      isLoading: false,
    });
  });

  describe('Sign In Mode', () => {
    it('should render sign-in form by default', () => {
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should validate email format on sign-in', async () => {
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
      
      expect(mockSignInUser).not.toHaveBeenCalled();
    });

    it('should require password on sign-in', async () => {
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter your password')).toBeInTheDocument();
      });
      
      expect(mockSignInUser).not.toHaveBeenCalled();
    });

    it('should call signInUser with valid credentials', async () => {
      mockSignInUser.mockResolvedValue(undefined);
      
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSignInUser).toHaveBeenCalledWith('test@example.com', 'password123');
      });
      
      expect(mockOnAuthSuccess).toHaveBeenCalled();
    });

    it('should display error from useAuth hook', () => {
      (useAuthModule.useAuth as jest.Mock).mockReturnValue({
        signInUser: mockSignInUser,
        signUpUser: mockSignUpUser,
        confirmUser: mockConfirmUser,
        clearError: mockClearError,
        error: 'Invalid credentials',
        isLoading: false,
      });
      
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('should disable inputs and button while loading', () => {
      (useAuthModule.useAuth as jest.Mock).mockReturnValue({
        signInUser: mockSignInUser,
        signUpUser: mockSignUpUser,
        confirmUser: mockConfirmUser,
        clearError: mockClearError,
        error: null,
        isLoading: true,
      });
      
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      expect(screen.getByLabelText('Email')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    it('should switch to sign-up mode when clicking sign-up link', () => {
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      const signUpLink = screen.getByText("Don't have an account? Sign up");
      fireEvent.click(signUpLink);
      
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });
  });

  describe('Sign Up Mode', () => {
    beforeEach(() => {
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      const signUpLink = screen.getByText("Don't have an account? Sign up");
      fireEvent.click(signUpLink);
    });

    it('should render sign-up form', () => {
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should validate name is required', async () => {
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Test1234!' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter your name')).toBeInTheDocument();
      });
      
      expect(mockSignUpUser).not.toHaveBeenCalled();
    });

    it('should validate email format on sign-up', async () => {
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'Test1234!' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
      
      expect(mockSignUpUser).not.toHaveBeenCalled();
    });

    it('should validate password complexity', async () => {
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      });
      
      expect(mockSignUpUser).not.toHaveBeenCalled();
    });

    it('should reject password without uppercase', async () => {
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'test1234!' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      });
      
      expect(mockSignUpUser).not.toHaveBeenCalled();
    });

    it('should reject password without number', async () => {
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'TestTest!' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      });
      
      expect(mockSignUpUser).not.toHaveBeenCalled();
    });

    it('should reject password without special character', async () => {
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Test1234' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      });
      
      expect(mockSignUpUser).not.toHaveBeenCalled();
    });

    it('should call signUpUser with valid data and switch to confirm mode', async () => {
      mockSignUpUser.mockResolvedValue(undefined);
      
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Test1234!' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSignUpUser).toHaveBeenCalledWith('test@example.com', 'Test1234!', 'Test User');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Confirm your email')).toBeInTheDocument();
      });
    });

    it('should switch back to sign-in mode when clicking sign-in link', () => {
      const signInLink = screen.getByText('Already have an account? Sign in');
      fireEvent.click(signInLink);
      
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });
  });

  describe('Confirmation Mode', () => {
    beforeEach(async () => {
      mockSignUpUser.mockResolvedValue(undefined);
      
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      // Navigate to sign-up
      const signUpLink = screen.getByText("Don't have an account? Sign up");
      fireEvent.click(signUpLink);
      
      // Fill and submit sign-up form
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Test1234!' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm your email')).toBeInTheDocument();
      });
    });

    it('should render confirmation form', () => {
      expect(screen.getByText('Confirm your email')).toBeInTheDocument();
      expect(screen.getByText(/We've sent a confirmation code to/i)).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmation Code')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm email/i })).toBeInTheDocument();
    });

    it('should validate confirmation code is required', async () => {
      const submitButton = screen.getByRole('button', { name: /confirm email/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter the confirmation code')).toBeInTheDocument();
      });
      
      expect(mockConfirmUser).not.toHaveBeenCalled();
    });

    it('should call confirmUser with code and switch to sign-in mode', async () => {
      mockConfirmUser.mockResolvedValue(undefined);
      
      const codeInput = screen.getByLabelText('Confirmation Code');
      const submitButton = screen.getByRole('button', { name: /confirm email/i });
      
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockConfirmUser).toHaveBeenCalledWith('test@example.com', '123456');
      });
      
      await waitFor(() => {
        expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
      });
    });

    it('should switch back to sign-in mode when clicking back link', () => {
      const backLink = screen.getByText('Back to sign in');
      fireEvent.click(backLink);
      
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when switching modes', async () => {
      (useAuthModule.useAuth as jest.Mock).mockReturnValue({
        signInUser: mockSignInUser,
        signUpUser: mockSignUpUser,
        confirmUser: mockConfirmUser,
        clearError: mockClearError,
        error: 'Some error',
        isLoading: false,
      });
      
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      expect(screen.getByText('Some error')).toBeInTheDocument();
      
      const signUpLink = screen.getByText("Don't have an account? Sign up");
      fireEvent.click(signUpLink);
      
      expect(mockClearError).toHaveBeenCalled();
    });

    it('should display local validation errors', async () => {
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const emailInput = screen.getByLabelText('Email');
      
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should handle sign-in errors gracefully', async () => {
      mockSignInUser.mockRejectedValue(new Error('Network error'));
      
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSignInUser).toHaveBeenCalled();
      });
      
      // Error should be handled by useAuth hook
      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Test Credentials Display', () => {
    it('should display test credentials hint', () => {
      render(<AuthFlow onAuthSuccess={mockOnAuthSuccess} />);
      
      expect(screen.getByText(/Test credentials:/i)).toBeInTheDocument();
      expect(screen.getByText(/demo@example.com/i)).toBeInTheDocument();
    });
  });
});
