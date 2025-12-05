# Design Document

## Overview

This design addresses the Cognito username/email alias configuration mismatch that prevents new user sign-ups. The root cause is that the User Pool uses `signInAliases` (which requires a non-email username + email attribute), but the code passes email as the username during sign-up.

The solution implements automatic username generation from email addresses, ensuring Cognito compatibility while maintaining a seamless user experience where users only interact with email addresses.

## Architecture

### Current Flow (Broken)
```
User enters email → signUp({ username: email, ... }) → Cognito rejects (email format not allowed)
```

### Fixed Flow
```
User enters email → Generate unique username → signUp({ username: generated, email: email, ... }) → Success
User signs in with email → signIn({ username: email, ... }) → Cognito resolves via alias → Success
```

### Key Design Decisions

1. **Username Generation Strategy**: Use sanitized email prefix + timestamp for uniqueness
2. **Sign-In Unchanged**: Continue using email as username (Cognito resolves via alias)
3. **User-Facing**: Users never see generated usernames (email-only UX)
4. **Backward Compatible**: Existing users unaffected

## Components and Interfaces

### 1. Username Generator Utility

**Location**: `hooks/useAuth.ts` (inline helper) or `utils/auth.ts` (if extracted)

**Function Signature**:
```typescript
function generateUsername(email: string): string
```

**Implementation Strategy**:
```typescript
// Example: user@example.com → user-1731686400123
// Format: {sanitized-prefix}-{timestamp}

function generateUsername(email: string): string {
  // Extract prefix before @
  const prefix = email.split('@')[0];
  
  // Sanitize: remove non-alphanumeric except hyphens
  const sanitized = prefix.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Ensure minimum length (Cognito requires at least 1 char)
  const safePrefix = sanitized.slice(0, 20) || 'user';
  
  // Add timestamp for uniqueness
  const timestamp = Date.now();
  
  return `${safePrefix}-${timestamp}`;
}
```

**Edge Cases Handled**:
- Email with special characters: `user+test@example.com` → `usertest-1731686400123`
- Short email: `a@b.com` → `a-1731686400123`
- No prefix: `@example.com` → `user-1731686400123` (fallback)
- Long prefix: Truncate to 20 chars to stay under Cognito's 128 char limit

### 2. Updated Sign-Up Flow

**Location**: `hooks/useAuth.ts` → `signUpUser` function

**Changes**:
```typescript
// BEFORE (broken)
const signUpInput: SignUpInput = {
  username: email,  // ❌ Cognito rejects email format
  password,
  options: {
    userAttributes: {
      email,
      name,
    },
  },
};

// AFTER (fixed)
const signUpInput: SignUpInput = {
  username: generateUsername(email),  // ✅ Non-email format
  password,
  options: {
    userAttributes: {
      email,  // Email stored as attribute
      name,
    },
  },
};
```

### 3. Sign-In Flow (No Changes Required)

**Location**: `hooks/useAuth.ts` → `signInUser` function

**Current Implementation** (already correct):
```typescript
const signInInput: SignInInput = {
  username: email,  // ✅ Cognito resolves via signInAliases
  password,
};
```

**Why This Works**:
- Cognito's `signInAliases: { email: true }` allows sign-in with email
- Cognito internally maps email → actual username
- No code changes needed for sign-in

### 4. Confirmation Flow (No Changes Required)

**Location**: `hooks/useAuth.ts` → `confirmUser` function

**Current Implementation** (already correct):
```typescript
await confirmSignUp({
  username: email,  // ✅ Cognito resolves via alias
  confirmationCode: code,
});
```

## Data Models

### Cognito User Attributes

```typescript
// After sign-up, Cognito stores:
{
  username: "user-1731686400123",        // Generated (internal)
  email: "user@example.com",             // User-provided (visible)
  name: "John Doe",                      // User-provided
  email_verified: false,                 // Set to true after confirmation
  sub: "uuid-...",                       // Cognito user ID
}
```

### Frontend User Model (No Changes)

```typescript
// useAuth hook returns (unchanged):
export interface AuthUser {
  userId: string;      // From Cognito sub
  email?: string;      // From Cognito email attribute
  username: string;    // From Cognito username (but we show email in UI)
}
```

**UI Display Strategy**:
- Show `email` in UI, not `username`
- Generated username is internal implementation detail

## Error Handling

### 1. Username Collision (Unlikely but Possible)

**Scenario**: Two users sign up with same email prefix at exact same millisecond

**Handling**:
```typescript
try {
  await signUp(signUpInput);
} catch (err: any) {
  if (err.name === 'UsernameExistsException') {
    // Retry with new timestamp
    const retryUsername = generateUsername(email);
    await signUp({ ...signUpInput, username: retryUsername });
  } else {
    throw err;
  }
}
```

**Max Retries**: 3 attempts (probability of collision after 3 attempts is negligible)

### 2. Invalid Email Format

**Scenario**: User enters malformed email

**Handling**: Already handled by frontend validation in `AuthFlow.tsx`

```typescript
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

### 3. Cognito Service Errors

**Scenario**: Network issues, Cognito throttling, etc.

**Handling**: Preserve existing error handling in `useAuth.ts`

```typescript
catch (err: any) {
  console.error('Sign up error:', err);
  setError(err.message || 'Failed to sign up. Please try again.');
  throw err;
}
```

## Testing Strategy

### 1. Unit Tests

**File**: `hooks/__tests__/useAuth.test.ts`

**New Tests**:
```typescript
describe('generateUsername', () => {
  it('should generate username from email prefix', () => {
    const username = generateUsername('john@example.com');
    expect(username).toMatch(/^john-\d+$/);
  });

  it('should sanitize special characters', () => {
    const username = generateUsername('user+test@example.com');
    expect(username).toMatch(/^usertest-\d+$/);
  });

  it('should handle short emails', () => {
    const username = generateUsername('a@b.com');
    expect(username).toMatch(/^a-\d+$/);
  });

  it('should use fallback for invalid emails', () => {
    const username = generateUsername('@example.com');
    expect(username).toMatch(/^user-\d+$/);
  });

  it('should generate unique usernames', () => {
    const username1 = generateUsername('test@example.com');
    const username2 = generateUsername('test@example.com');
    expect(username1).not.toBe(username2);
  });
});

describe('signUpUser with username generation', () => {
  it('should call signUp with generated username', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({});
    // ... test implementation
  });
});
```

### 2. Integration Tests

**File**: `hooks/__tests__/useAuth.integration.test.ts` (new)

**Tests**:
- Sign up with real Cognito (test environment)
- Verify email stored as attribute
- Verify sign-in works with email after sign-up

### 3. E2E Tests

**File**: `e2e/auth-flow.spec.ts`

**Updated Tests**:
```typescript
test('should sign up new user successfully', async ({ page }) => {
  const testEmail = `test-${Date.now()}@example.com`;
  
  await page.goto('http://localhost:3001/');
  await page.click('text=Sign up');
  await page.fill('#name', 'Test User');
  await page.fill('#email', testEmail);
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  
  // Should show confirmation mode (not error)
  await expect(page.locator('text=confirmation code')).toBeVisible();
});
```

### 4. Manual Testing Checklist

- [ ] Sign up with new email → Success (no "email format" error)
- [ ] Confirm email with code → Success
- [ ] Sign in with email → Success
- [ ] Sign out → Success
- [ ] Sign in again → Success
- [ ] Check Cognito console → Username is generated, email is attribute

## Migration Strategy

### Existing Users

**No migration needed**:
- Existing users already have usernames (created before this bug)
- Sign-in flow unchanged (uses email alias)
- No data changes required

### New Users (After Fix)

**Automatic**:
- All new sign-ups use generated usernames
- Users never see generated usernames
- Email-only UX maintained

### Rollback Plan

**If issues arise**:
1. Revert code changes to `useAuth.ts`
2. Investigate specific error cases
3. No database/Cognito changes needed (usernames are immutable)

## Performance Considerations

### Username Generation

**Cost**: O(1) - Simple string operations + timestamp
**Latency**: <1ms (negligible)

### Sign-Up Latency

**Before**: ~500ms (Cognito API call)
**After**: ~500ms (no measurable change)

### Collision Retry

**Probability**: ~0.001% (two users, same email prefix, same millisecond)
**Max Retries**: 3
**Worst Case Latency**: +1500ms (3 retries × 500ms)

## Security Considerations

### Username Predictability

**Concern**: Generated usernames include timestamp (predictable)

**Mitigation**:
- Usernames are not secret (email is the identifier)
- Cognito uses `sub` (UUID) as primary key internally
- Username enumeration already possible via email (sign-in alias)

**Conclusion**: No additional security risk

### Email Verification

**Unchanged**:
- Email verification still required (autoVerify: { email: true })
- Unverified users cannot sign in
- No security regression

## Alternative Designs Considered

### Alternative 1: Use UUID for Username

**Approach**: `username: uuidv4()`

**Pros**:
- Guaranteed uniqueness
- No collision risk

**Cons**:
- Less debuggable (no email context)
- Requires UUID library dependency

**Decision**: Rejected (timestamp sufficient, email prefix aids debugging)

### Alternative 2: Change Cognito to usernameAttributes

**Approach**: Reconfigure User Pool with `usernameAttributes: ['email']`

**Pros**:
- Email IS username (no generation needed)
- Simpler code

**Cons**:
- Requires User Pool recreation (RETAIN policy prevents modification)
- Breaks existing users (migration nightmare)
- Downtime during migration

**Decision**: Rejected (too risky, not backward compatible)

### Alternative 3: Use Email as Username (Remove Alias)

**Approach**: Remove `signInAliases`, use email directly

**Pros**:
- Simplest implementation

**Cons**:
- Requires User Pool recreation
- Breaks existing users

**Decision**: Rejected (same issues as Alternative 2)

## Implementation Notes

### Code Changes Summary

**Files Modified**:
1. `hooks/useAuth.ts` - Add `generateUsername()`, update `signUpUser()`

**Files Added**:
- None (inline implementation)

**Files Unchanged**:
- `components/AuthFlow.tsx` - No UI changes
- `infra/lib/scrum-realtime-stack.ts` - No infrastructure changes
- All other auth-related files

### Deployment Steps

1. **Code Changes**: Update `useAuth.ts`
2. **Testing**: Run unit tests, E2E tests
3. **Deploy**: Standard deployment (no infrastructure changes)
4. **Verify**: Test sign-up in production
5. **Monitor**: Check CloudWatch logs for errors

### Rollback Steps

1. **Revert**: Git revert commit
2. **Deploy**: Redeploy previous version
3. **Verify**: Existing users unaffected

**Risk**: Low (no infrastructure changes, backward compatible)

## Success Metrics

### Primary Metrics

1. **Sign-Up Success Rate**: 0% → 100%
2. **"Email Format" Errors**: Current → 0
3. **Sign-In Success Rate**: Unchanged (maintain 100%)

### Monitoring

**CloudWatch Logs**:
- Filter: `"Username cannot be of email format"` → Should be 0
- Filter: `"Sign up error"` → Monitor for new error types

**User Feedback**:
- Support tickets about sign-up → Should decrease to 0

## Documentation Updates

### Developer Documentation

**File**: `docs/guides/authentication.md` (if exists)

**Add Section**:
```markdown
## Username Generation

Scrum Reborn uses email-based sign-in, but Cognito requires non-email usernames.
The system automatically generates usernames in the format: `{email-prefix}-{timestamp}`.

Users never see these generated usernames - they only interact with email addresses.
```

### README Updates

**No changes needed** - User-facing documentation already describes email-based auth

## Future Enhancements

### 1. Custom Username Format

**Idea**: Allow users to choose custom usernames (optional)

**Implementation**:
- Add optional username field to sign-up form
- Validate uniqueness before submission
- Fall back to generated username if not provided

**Priority**: Low (current solution sufficient)

### 2. Username Migration Tool

**Idea**: Script to migrate existing users to predictable username format

**Use Case**: If we want consistent username patterns

**Priority**: Very Low (no business need)

### 3. Analytics on Username Patterns

**Idea**: Track most common email prefixes, collision rates

**Use Case**: Optimize generation algorithm

**Priority**: Low (current algorithm sufficient)
