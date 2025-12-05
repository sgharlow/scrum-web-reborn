import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

type AuthMode = 'signin' | 'signup' | 'confirm';

interface AuthFlowProps {
  onAuthSuccess: () => void;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ onAuthSuccess }) => {
  const { signInUser, signUpUser, confirmUser, resendCode, error, isLoading, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // AWS Cognito default: min 8 chars, uppercase, lowercase, number, special char
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[^A-Za-z0-9]/.test(password);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !validateEmail(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (!password || password.trim() === '') {
      setLocalError('Please enter your password');
      return;
    }

    try {
      await signInUser(email, password);
      onAuthSuccess();
    } catch (err) {
      // Error is handled by useAuth hook
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!name.trim()) {
      setLocalError('Please enter your name');
      return;
    }

    if (!validateEmail(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      setLocalError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    try {
      await signUpUser(email, password, name);
      setMode('confirm');
    } catch (err) {
      // Error is handled by useAuth hook
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!confirmationCode.trim()) {
      setLocalError('Please enter the confirmation code');
      return;
    }

    try {
      await confirmUser(email, confirmationCode);
      setMode('signin');
      setPassword('');
      setConfirmationCode('');
    } catch (err) {
      // Error is handled by useAuth hook
    }
  };

  const handleResendCode = async () => {
    setLocalError(null);
    clearError();

    if (!email) {
      setLocalError('Email is required to resend code');
      return;
    }

    try {
      await resendCode(email);
    } catch (err) {
      // Error is handled by useAuth hook
    }
  };

  const displayMessage = localError || error;

  // Determine if message is a success (green) or error (red)
  const isSuccess = displayMessage && (
    displayMessage.includes('check your email') ||
    displayMessage.includes('confirmed') ||
    displayMessage.includes('Account confirmed') ||
    displayMessage.includes('new confirmation code')
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Scrum Reborn</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {mode === 'signin' && 'Sign in to continue'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'confirm' && 'Confirm your email'}
          </p>
        </div>

        {displayMessage && (
          <div
            className={`${
              isSuccess
                ? 'bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300'
            } px-4 py-3 rounded-md animate-slide-in`}
            role="alert"
          >
            <span className="block sm:inline">{displayMessage}</span>
          </div>
        )}

        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-sky-600 text-white font-bold text-lg rounded-md hover:bg-sky-700 disabled:bg-slate-400 transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                  clearError();
                }}
                className="text-sky-600 dark:text-sky-400 hover:underline text-sm"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Min 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-sky-600 text-white font-bold text-lg rounded-md hover:bg-sky-700 disabled:bg-slate-400 transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError(null);
                  clearError();
                }}
                className="text-sky-600 dark:text-sky-400 hover:underline text-sm"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="bg-sky-100 dark:bg-sky-900/20 border border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300 px-4 py-3 rounded-md">
              <p className="text-sm">
                We've sent a confirmation code to <strong>{email}</strong>. Please check your email and enter the code below.
              </p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Confirmation Code
              </label>
              <input
                id="code"
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-2xl tracking-widest"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-sky-600 text-white font-bold text-lg rounded-md hover:bg-sky-700 disabled:bg-slate-400 transition-colors"
            >
              {isLoading ? 'Confirming...' : 'Confirm Email'}
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-sky-600 dark:text-sky-400 hover:underline text-sm disabled:text-slate-400"
              >
                {isLoading ? 'Sending...' : 'Resend Code'}
              </button>
              <br />
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError(null);
                  clearError();
                }}
                className="text-sky-600 dark:text-sky-400 hover:underline text-sm"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            Test credentials: demo@example.com / demo1234
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthFlow;
