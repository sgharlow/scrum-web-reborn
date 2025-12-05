# Quick Start: Manual Testing

## Immediate Steps to Begin Testing

### 1. Start Development Server

```bash
npm run dev
```

The app should start at `http://localhost:3001/`

### 2. Open AWS Cognito Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to: **Cognito** → **User Pools**
3. Select your **Scrum Reborn** user pool
4. Click on **Users** tab
5. Keep this tab open for verification

### 3. Quick Test (5 minutes)

**Test a basic sign-up:**

1. Open `http://localhost:3001/` in your browser
2. Click "Sign up"
3. Fill in:
   - Name: `Test User`
   - Email: `test-${Date.now()}@example.com` (use a unique email)
   - Password: `TestPass123!`
4. Click "Sign Up"

**Expected Result:**
- ✅ Message: "Please check your email for a confirmation code"
- ❌ NO ERROR: "Username cannot be of email format"

**Verify in Cognito:**
1. Refresh the Users list in Cognito Console
2. Find your new user
3. Check username format: Should be `test-{timestamp}` (e.g., `test-1731686400123`)
4. Check email attribute: Should show your test email

### 4. Full Testing

For comprehensive testing, follow the complete guide:
📄 **[MANUAL-TESTING-GUIDE.md](./MANUAL-TESTING-GUIDE.md)**

---

## Quick Verification Checklist

- [ ] Dev server running
- [ ] Sign-up form loads without errors
- [ ] Can submit sign-up form
- [ ] No "email format" error appears
- [ ] Confirmation code screen appears
- [ ] Username in Cognito is NOT in email format
- [ ] Email is stored as user attribute in Cognito

---

## If You Encounter Issues

### "Username cannot be of email format" still appears

1. Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Check that `hooks/useAuth.ts` has the `generateUsername()` function
3. Restart dev server

### Can't access Cognito Console

You'll need AWS credentials with access to the Cognito User Pool. Contact your AWS administrator.

### Need test email addresses

Use Gmail's `+` addressing:
- `yourname+test1@gmail.com`
- `yourname+test2@gmail.com`
- All go to `yourname@gmail.com` but Cognito treats them as unique

---

## Success Criteria

✅ **Primary Goal**: Sign up completes without "Username cannot be of email format" error

✅ **Secondary Goals**:
- Username in Cognito follows pattern: `{prefix}-{timestamp}`
- Email stored as user attribute
- Sign-in works with email address
- No console errors

---

**Ready to test?** Start with the Quick Test above, then proceed to the full guide for comprehensive coverage.
