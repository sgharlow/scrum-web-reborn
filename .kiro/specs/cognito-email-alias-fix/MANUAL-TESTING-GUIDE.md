# Manual Testing Guide: Cognito Email Alias Fix

## Overview
This guide provides step-by-step instructions for manually testing the Cognito username generation fix. All automated tests have passed, but manual verification ensures the complete user experience works correctly.

## Prerequisites

- [ ] Development environment running (`npm run dev`)
- [ ] Access to AWS Cognito Console
- [ ] Multiple test email addresses (or use + addressing: `yourname+test1@gmail.com`)
- [ ] Browser DevTools open (Console tab)

## Test Environment Setup

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the application**:
   - Navigate to `http://localhost:3001/` (or your dev URL)

3. **Open AWS Cognito Console**:
   - Go to AWS Console → Cognito → User Pools
   - Select your Scrum Reborn user pool
   - Keep the "Users" tab open for verification

4. **Open Browser DevTools**:
   - Press F12 or right-click → Inspect
   - Go to Console tab
   - Clear any existing logs

---

## Test Case 1: Basic Sign-Up Flow

**Objective**: Verify new users can sign up without "email format" errors

### Steps:

1. **Navigate to sign-up**:
   - Click "Sign up" or navigate to sign-up form
   - ✅ Form should display: Name, Email, Password fields

2. **Enter test credentials**:
   ```
   Name: Test User 1
   Email: test-{timestamp}@example.com  (use unique email)
   Password: TestPass123!
   ```

3. **Submit the form**:
   - Click "Sign Up" button
   - ⏱️ Wait for response

4. **Expected Results**:
   - ✅ **NO ERROR**: "Username cannot be of email format"
   - ✅ **SUCCESS**: Message about checking email for confirmation code
   - ✅ **UI CHANGE**: Form switches to confirmation code input
   - ✅ **CONSOLE**: No errors in browser console

5. **Verify in Cognito Console**:
   - Refresh the Users list in Cognito
   - Find the newly created user
   - ✅ **Username format**: Should be `{prefix}-{timestamp}` (e.g., `test-1731686400123`)
   - ✅ **Email attribute**: Should show your test email
   - ✅ **Status**: Should be "UNCONFIRMED"

**Screenshot Checklist**:
- [ ] Sign-up form filled out
- [ ] Success message displayed
- [ ] Cognito console showing generated username
- [ ] Cognito console showing email attribute

---

## Test Case 2: Confirmation Code Flow

**Objective**: Verify email confirmation works with generated usernames

### Steps:

1. **Get confirmation code**:
   - Check your email inbox for confirmation code
   - (If using test email, check Cognito Console → User → "Send confirmation code")

2. **Enter confirmation code**:
   - Type the 6-digit code into the confirmation field
   - Click "Confirm" button

3. **Expected Results**:
   - ✅ **SUCCESS**: "Account confirmed! You can now sign in."
   - ✅ **UI CHANGE**: Redirects to sign-in form or shows success message
   - ✅ **CONSOLE**: No errors

4. **Verify in Cognito Console**:
   - Refresh the user in Cognito
   - ✅ **Status**: Should change to "CONFIRMED"
   - ✅ **Email verified**: Should show "true"

---

## Test Case 3: Sign-In with Email

**Objective**: Verify users can sign in using their email (not generated username)

### Steps:

1. **Navigate to sign-in**:
   - Go to sign-in form
   - Clear any existing session

2. **Enter credentials**:
   ```
   Email: {same email from sign-up}
   Password: TestPass123!
   ```

3. **Submit the form**:
   - Click "Sign In" button
   - ⏱️ Wait for authentication

4. **Expected Results**:
   - ✅ **SUCCESS**: User is authenticated
   - ✅ **UI CHANGE**: Redirects to main app (room creation/join)
   - ✅ **USER INFO**: Display name shows email (not generated username)
   - ✅ **CONSOLE**: No errors

5. **Verify session**:
   - Check browser DevTools → Application → Local Storage
   - ✅ **Auth tokens**: Should be present
   - ✅ **User data**: Should contain email

---

## Test Case 4: Special Characters in Email

**Objective**: Verify username generation handles special characters correctly

### Test Emails:

| Email Format | Expected Username Pattern | Notes |
|--------------|---------------------------|-------|
| `user+test@example.com` | `usertest-{timestamp}` | Plus sign removed |
| `first.last@example.com` | `firstlast-{timestamp}` | Dot removed |
| `user_name@example.com` | `username-{timestamp}` | Underscore removed |
| `user-name@example.com` | `user-name-{timestamp}` | Hyphen preserved |
| `123user@example.com` | `123user-{timestamp}` | Numbers preserved |

### Steps for Each Email:

1. Sign up with the test email
2. Verify no errors
3. Check Cognito console for username format
4. ✅ **Verify**: Username matches expected pattern
5. ✅ **Verify**: Only alphanumeric + hyphens in username

---

## Test Case 5: Short Email Prefix

**Objective**: Verify handling of very short email addresses

### Test Emails:

- `a@b.com` → Expected: `a-{timestamp}`
- `x@example.com` → Expected: `x-{timestamp}`
- `12@test.com` → Expected: `12-{timestamp}`

### Steps:

1. Sign up with short email
2. ✅ **Verify**: Username is generated (not rejected)
3. ✅ **Verify**: Username has at least 1 character before hyphen
4. Complete confirmation and sign-in flow

---

## Test Case 6: Long Email Prefix

**Objective**: Verify username truncation for long email prefixes

### Test Email:

```
verylongemailaddressthatexceedstwentycharacters@example.com
```

### Steps:

1. Sign up with long email
2. Check Cognito console
3. ✅ **Verify**: Username prefix is truncated to 20 characters
4. ✅ **Verify**: Total username length is reasonable (~34 chars)
5. ✅ **Verify**: Username is under 128 character limit

---

## Test Case 7: Concurrent Sign-Ups (Username Collision)

**Objective**: Verify retry logic handles username collisions

**Note**: This is extremely rare but should be tested if possible.

### Steps:

1. **Prepare two browser windows**:
   - Open app in two different browsers or incognito windows
   - Use same email prefix: `collision-test@example.com`

2. **Attempt simultaneous sign-up**:
   - Fill out forms in both windows
   - Click "Sign Up" in both windows at nearly the same time

3. **Expected Results**:
   - ✅ **BOTH SUCCEED**: Both sign-ups should complete (different timestamps)
   - ✅ **DIFFERENT USERNAMES**: Check Cognito - usernames should differ by timestamp
   - ✅ **NO ERRORS**: Neither should show collision error to user

4. **Check Console Logs**:
   - If collision occurred, should see retry log message
   - ✅ **Verify**: Retry was automatic and transparent to user

---

## Test Case 8: Console Error Verification

**Objective**: Ensure no JavaScript errors during sign-up process

### Steps:

1. **Clear console**: Click "Clear console" in DevTools

2. **Complete full flow**:
   - Sign up → Confirm → Sign in → Sign out

3. **Review console**:
   - ✅ **NO ERRORS**: No red error messages
   - ✅ **INFO LOGS**: May see info/debug logs (acceptable)
   - ✅ **WARNINGS**: Should be minimal or none

4. **Check Network tab**:
   - ✅ **API CALLS**: All Cognito API calls should return 200/success
   - ✅ **NO 400/500**: No client or server errors

---

## Test Case 9: Sign-Out and Re-Sign-In

**Objective**: Verify complete authentication lifecycle

### Steps:

1. **Sign in** with confirmed account
2. **Sign out** using sign-out button
3. ✅ **Verify**: Redirected to sign-in page
4. ✅ **Verify**: Session cleared (check Local Storage)
5. **Sign in again** with same email
6. ✅ **Verify**: Authentication succeeds
7. ✅ **Verify**: User data restored

---

## Test Case 10: Invalid Scenarios

**Objective**: Verify error handling for invalid inputs

### Scenarios to Test:

1. **Invalid email format**:
   - Input: `notanemail`
   - ✅ **Expected**: Frontend validation error (before API call)

2. **Weak password**:
   - Input: `123`
   - ✅ **Expected**: Cognito password policy error

3. **Duplicate email**:
   - Sign up with same email twice
   - ✅ **Expected**: "User already exists" error

4. **Wrong confirmation code**:
   - Enter incorrect code
   - ✅ **Expected**: "Invalid verification code" error

5. **Wrong password on sign-in**:
   - Enter incorrect password
   - ✅ **Expected**: "Incorrect username or password" error

---

## Cognito Console Verification Checklist

For each successful sign-up, verify in Cognito Console:

- [ ] **Username format**: `{prefix}-{timestamp}` (NOT email format)
- [ ] **Email attribute**: Correct email address stored
- [ ] **Email verified**: `true` after confirmation
- [ ] **Status**: `CONFIRMED` after confirmation
- [ ] **User attributes**: Name attribute present
- [ ] **Created date**: Recent timestamp
- [ ] **Last modified**: Updated after confirmation

---

## Success Criteria Summary

All tests pass if:

1. ✅ **No "email format" errors** during sign-up
2. ✅ **Generated usernames** visible in Cognito (format: `prefix-timestamp`)
3. ✅ **Email stored as attribute** (not as username)
4. ✅ **Sign-in works with email** (Cognito alias resolution)
5. ✅ **Confirmation flow works** correctly
6. ✅ **Special characters handled** properly
7. ✅ **No console errors** during any flow
8. ✅ **Edge cases handled** (short/long emails)
9. ✅ **Complete lifecycle works** (sign-up → confirm → sign-in → sign-out)

---

## Troubleshooting

### Issue: "Username cannot be of email format" still appears

**Possible Causes**:
- Code not deployed to dev environment
- Browser cache (hard refresh: Ctrl+Shift+R)
- Wrong environment variables

**Solution**:
1. Verify `generateUsername()` function exists in `hooks/useAuth.ts`
2. Check that `signUpUser()` calls `generateUsername(email)`
3. Clear browser cache and reload
4. Restart dev server

### Issue: Confirmation code not received

**Possible Causes**:
- Email not configured in Cognito
- Test email address invalid

**Solution**:
1. Check Cognito Console → User → "Send confirmation code"
2. Use Cognito Console to manually confirm user for testing
3. Check spam folder

### Issue: Sign-in fails after sign-up

**Possible Causes**:
- User not confirmed
- Wrong password
- Cognito alias not configured

**Solution**:
1. Verify user status is "CONFIRMED" in Cognito
2. Check Cognito User Pool settings → Sign-in experience → "Email" is enabled
3. Try signing in with generated username (should also work)

---

## Reporting Results

After completing all tests, document:

1. **Test Date**: {date}
2. **Environment**: Development / Staging / Production
3. **Test Results**: Pass/Fail for each test case
4. **Screenshots**: Attach key screenshots (Cognito console, success messages)
5. **Issues Found**: List any bugs or unexpected behavior
6. **Console Logs**: Copy any relevant error messages

**Report Template**:

```markdown
## Manual Testing Results

**Date**: 2024-11-15
**Tester**: {Your Name}
**Environment**: Development

### Test Results

- [x] Test Case 1: Basic Sign-Up Flow - PASS
- [x] Test Case 2: Confirmation Code Flow - PASS
- [x] Test Case 3: Sign-In with Email - PASS
- [x] Test Case 4: Special Characters - PASS
- [x] Test Case 5: Short Email Prefix - PASS
- [x] Test Case 6: Long Email Prefix - PASS
- [ ] Test Case 7: Concurrent Sign-Ups - SKIP (difficult to reproduce)
- [x] Test Case 8: Console Errors - PASS
- [x] Test Case 9: Sign-Out/Re-Sign-In - PASS
- [x] Test Case 10: Invalid Scenarios - PASS

### Issues Found

None - all tests passed successfully.

### Screenshots

[Attach screenshots here]

### Notes

Username generation working as expected. No "email format" errors observed.
```

---

## Next Steps After Testing

Once manual testing is complete and all tests pass:

1. ✅ Mark task 8 as complete in `tasks.md`
2. 📝 Update documentation if needed
3. 🚀 Deploy to staging environment
4. 🔄 Repeat key tests in staging
5. 🎉 Deploy to production
6. 📊 Monitor CloudWatch logs for any issues

---

**Document Version**: 1.0
**Last Updated**: 2024-11-15
**Related Spec**: `.kiro/specs/cognito-email-alias-fix/`
