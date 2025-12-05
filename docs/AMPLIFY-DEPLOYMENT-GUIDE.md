# AWS Amplify Hosting Deployment Guide

**Estimated Time:** 15-30 minutes
**Cost:** FREE (within free tier limits)

---

## Prerequisites

- ✅ AWS Account (same one used for AppSync/Cognito/DynamoDB)
- ✅ GitHub repository (will be made public)
- ✅ Code builds successfully (`npm run build`)

---

## Step 1: Prepare Your Repository (5 minutes)

### 1.1 Add `.gitignore` Entry for Environment Files

Ensure your `.gitignore` includes:
```
.env.local
.env*.local
DEPLOYMENT-OUTPUTS.md
```

### 1.2 Update `README.md` (optional but recommended)

Add deployment badge placeholder (we'll update after deployment):
```markdown
[![Amplify Status](https://img.shields.io/badge/amplify-deployed-green)](https://your-app.amplifyapp.com)
```

---

## Step 2: Open AWS Amplify Console (2 minutes)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/home)
2. Select your region (same as your AppSync API, likely `us-east-1`)
3. Click **"New app"** → **"Host web app"**

---

## Step 3: Connect GitHub Repository (3 minutes)

### 3.1 Authorize GitHub
1. Select **"GitHub"** as your repository provider
2. Click **"Continue"**
3. Authorize AWS Amplify to access your GitHub account
4. Select your repository: `scrum-web-reborn`
5. Select branch: `main`
6. Click **"Next"**

### 3.2 Configure Build Settings

Amplify will auto-detect Vite. Verify the build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

Click **"Next"**

---

## Step 4: Add Environment Variables (5 minutes)

### 4.1 Add Required Environment Variables

In the Amplify Console, go to **"Advanced settings"** → **"Environment variables"**

Add these variables (from your `.env.local`):

| Key | Value | Example |
|-----|-------|---------|
| `VITE_AWS_REGION` | Your AWS region | `us-east-1` |
| `VITE_GRAPHQL_ENDPOINT` | AppSync API endpoint | `https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `us-east-1_xxxxxxxxx` |
| `VITE_COGNITO_CLIENT_ID` | Cognito Client ID | `xxxxxxxxxxxxxxxxxxxxxxxxxx` |

**Where to find these values:**
- From your `.env.local` file
- OR from CDK outputs: `cd infra && cdk deploy` (look at outputs)
- OR from AWS Console:
  - AppSync: AppSync Console → Your API → Settings → API URL
  - Cognito: Cognito Console → User Pools → Your Pool → App integration

---

## Step 5: Deploy (10 minutes)

1. Click **"Save and deploy"**
2. Amplify will:
   - Clone your repository
   - Install dependencies (`npm ci`)
   - Build your app (`npm run build`)
   - Deploy to CloudFront CDN
   - Provide a URL like: `https://main.xxxxxx.amplifyapp.com`

**Wait for build to complete** (usually 3-5 minutes)

---

## Step 6: Verify Deployment (5 minutes)

### 6.1 Open Your App

Click the provided URL: `https://main.xxxxxx.amplifyapp.com`

### 6.2 Test Core Functionality

1. ✅ Page loads (no blank screen)
2. ✅ Sign-in page appears
3. ✅ Can sign in with existing account
4. ✅ Can create/join room (test with real room code)

### 6.3 Check Network Tab

Open browser DevTools → Network tab:
- ✅ Should see requests to AppSync endpoint
- ✅ Should see WebSocket connection for subscriptions
- ❌ Should NOT see any PeerJS/TURN server requests

---

## Step 7: Configure Custom Domain (Optional, 10 minutes)

If you want `scrum-reborn.yourdomain.com` instead of `amplifyapp.com`:

1. Go to **"Domain management"** in Amplify Console
2. Click **"Add domain"**
3. Enter your domain
4. Follow DNS configuration instructions
5. Wait for SSL certificate (5-15 minutes)

**For hackathon, the `.amplifyapp.com` domain is fine!**

---

## Step 8: Enable Auto-Deploy (2 minutes)

Already enabled by default! Every `git push` to `main` branch will:
1. Trigger a new build
2. Deploy automatically
3. Update your live URL

---

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- **Fix:** Ensure `package.json` has all dependencies
- **Run locally:** `rm -rf node_modules && npm install && npm run build`

**Error: "Environment variable undefined"**
- **Fix:** Double-check environment variables in Amplify Console
- **Note:** Must start with `VITE_` for Vite to expose them

### App Loads But Blank Screen

**Check browser console for errors:**
- **Error: "Auth UserPool not configured"**
  - **Fix:** Verify `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_CLIENT_ID` are set
- **Error: "Network request failed"**
  - **Fix:** Verify `VITE_GRAPHQL_ENDPOINT` is correct

### Sign-In Fails

**Error: "Incorrect username or password"**
- **Fix:** Create a test user in Cognito Console
- **OR:** Sign up a new account through the app

---

## Cost Estimate

**AWS Amplify Hosting Free Tier:**
- 1000 build minutes/month
- 15 GB served/month
- 5 GB storage

**Expected cost for this hackathon:** $0 (within free tier)

**After hackathon (if you keep it running):**
- ~$0.10-1.00/month for low traffic
- Build minutes only used on deployments

---

## Post-Deployment Checklist

- [ ] App loads successfully at Amplify URL
- [ ] Can sign in/sign up
- [ ] Can create room
- [ ] Can join room
- [ ] Multi-device sync works (test on phone + laptop)
- [ ] WebSocket subscriptions working (check network tab)
- [ ] Copy Amplify URL for Devpost submission
- [ ] Update README with live demo link

---

## For Devpost Submission

**Live Demo URL:**
```
https://main.xxxxxx.amplifyapp.com
```

**Demo Credentials** (create these test users in Cognito):
```
Email: demo@scrumreborn.com
Password: Demo1234!
```

---

## Bonus: Monitor Your App

### Amplify Console Monitoring

1. Go to Amplify Console → Your App
2. View **"Monitoring"** tab:
   - Page views
   - Requests
   - Data transfer
   - Errors

### CloudWatch Logs

Amplify doesn't log frontend errors by default, but you can:
- Check browser console for errors
- Use AppSync CloudWatch logs for backend errors

---

## Quick Commands Reference

```bash
# Test build locally
npm run build
npm run preview

# Check environment variables
cat .env.local

# Deploy via git (after Amplify setup)
git add .
git commit -m "Deploy to Amplify"
git push origin main
```

---

**Deployment Status:** ⏳ Pending
**Created:** 2025-11-15
**Estimated Total Time:** 15-30 minutes
