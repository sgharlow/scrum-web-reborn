# Implementation Plan

- [x] 1. Implement username generation utility





  - Add `generateUsername()` function to `hooks/useAuth.ts` that creates unique usernames from email addresses
  - Sanitize email prefix by removing special characters except hyphens
  - Append timestamp for uniqueness guarantee
  - Handle edge cases: short emails, special characters, missing prefix
  - Ensure generated usernames comply with Cognito requirements (alphanumeric + hyphens, max 128 chars)
  - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3, 3.5_

- [x] 2. Update sign-up flow to use generated usernames





  - Modify `signUpUser()` function in `hooks/useAuth.ts` to call `generateUsername(email)`
  - Pass generated username to Cognito `signUp()` API
  - Ensure email is stored as a user attribute (not as username)
  - Preserve existing error handling and loading states
  - _Requirements: 1.1, 1.2, 2.4_

- [x] 3. Add retry logic for username collisions





  - Wrap `signUp()` call in try-catch to detect `UsernameExistsException`
  - Implement retry mechanism with new timestamp on collision
  - Limit retries to 3 attempts maximum
  - Log collision events for monitoring
  - Display user-friendly error after max retries exceeded
  - _Requirements: 1.5, 4.1, 4.2_

- [x] 4. Verify sign-in and confirmation flows remain unchanged









  - Review `signInUser()` function to confirm it uses email as username (Cognito alias resolution)
  - Review `confirmUser()` function to confirm it uses email for confirmation
  - Ensure no code changes needed for these flows
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Add unit tests for username generation





  - Write tests for `generateUsername()` with various email formats
  - Test sanitization of special characters
  - Test handling of short/long email prefixes
  - Test uniqueness (consecutive calls produce different usernames)
  - Test edge cases: empty prefix, invalid emails
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Update existing auth unit tests





  - Modify `useAuth.test.ts` to expect generated usernames in sign-up calls
  - Update mocks to handle username generation
  - Verify sign-in tests remain unchanged
  - Ensure test coverage remains above 90%
  - _Requirements: 5.1, 5.4_

- [x] 7. Update E2E tests for sign-up flow





  - Modify `e2e/auth-flow.spec.ts` to test complete sign-up with generated usernames
  - Verify no "email format" errors appear
  - Test sign-in after sign-up with email address
  - Add test for concurrent sign-ups with same email prefix
  - _Requirements: 5.2, 5.5_

- [x] 8. Manual testing and verification







  - Test sign-up with new email address in development environment
  - Verify confirmation code flow works correctly
  - Test sign-in with email after successful sign-up
  - Check Cognito console to verify username format and email attribute
  - Test with various email formats (special characters, short/long prefixes)
  - Verify no console errors during sign-up process
  - _Requirements: 5.1, 5.2, 5.3_
