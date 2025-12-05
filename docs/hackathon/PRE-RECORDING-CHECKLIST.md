# Pre-Recording Checklist - Demo Video

**Use this checklist to ensure a smooth video recording session.**

---

## ✅ Automated Tasks (COMPLETED)

- [x] Security audit - No exposed credentials found
- [x] Live demo URL accessible (https://main.d3tvb88c55agb4.amplifyapp.com)
- [x] README.md placeholder URLs updated
- [x] Working notes moved to docs/planning/session-notes/
- [x] Devpost submission text drafted (docs/hackathon/DEVPOST-SUBMISSION-FINAL.md)
- [x] Reliability metrics documented (docs/metrics/RELIABILITY-METRICS.md)
- [x] TODO comments cleaned up from code
- [x] LICENSE file verified (MIT)
- [x] GitHub setup commands created (docs/hackathon/GITHUB-SETUP-COMMANDS.sh)

---

## 📋 Manual Tasks (DO BEFORE RECORDING)

### 1. GitHub Repository Configuration (5 minutes)

Run these commands OR manually configure in GitHub web UI:

```bash
# Option A: Use GitHub CLI (recommended)
bash docs/hackathon/GITHUB-SETUP-COMMANDS.sh

# Option B: Manual configuration
# Go to: https://github.com/sgharlow/scrum-web-reborn/settings
# Set Description: "99x more reliable real-time Scrum collaboration with AWS AppSync - Planning poker and retrospectives that just work"
# Set Website: https://main.d3tvb88c55agb4.amplifyapp.com
# Add Topics: aws, appsync, dynamodb, hackathon, kiro, scrum, planning-poker, typescript, react, graphql, serverless, real-time
```

- [ ] Repository description set
- [ ] Website/homepage URL set
- [ ] Topics/tags added
- [ ] Verify at https://github.com/sgharlow/scrum-web-reborn

### 2. Test Live Demo End-to-End (15 minutes)

**Goal:** Ensure judges won't encounter any errors

1. **Test Sign-Up Flow**
   - [ ] Open https://main.d3tvb88c55agb4.amplifyapp.com in incognito
   - [ ] Click "Sign Up"
   - [ ] Enter test email (use + trick: yourname+test1@gmail.com)
   - [ ] Enter password (min 8 chars, 1 digit)
   - [ ] Receive confirmation code (check spam folder)
   - [ ] Confirm account
   - [ ] Sign in successfully

2. **Test Multi-Device Room Flow**
   - [ ] Window A: Create room "Sprint 42 Planning"
   - [ ] Note the 6-character room code
   - [ ] Window B: Open incognito OR second device
   - [ ] Window B: Sign in (or create second test account)
   - [ ] Window B: Join room using code
   - [ ] Both windows: Verify you see each other in participants list
   - [ ] Window A: Create story "Test AppSync reliability"
   - [ ] Window B: Verify story appears instantly
   - [ ] Both windows: Cast votes (different values)
   - [ ] Window A: Reveal votes
   - [ ] Both windows: Verify results show correctly with average
   - [ ] Check F12 console: No red errors

3. **Test Retrospective Mode**
   - [ ] Window A: Change room stage to "RETRO"
   - [ ] Window B: Verify UI switches to retro board
   - [ ] Window A: Add retro note "AppSync is amazing" (category: WENT_WELL)
   - [ ] Window B: Verify note appears
   - [ ] Window B: Upvote the note
   - [ ] Window A: Verify vote count increments
   - [ ] Check F12 console: No red errors

### 3. Prepare Demo Room Data (10 minutes)

**Create a demo room with realistic data for recording:**

- [ ] Create room with code: `KIRO24`
- [ ] Add 2-3 sample stories:
  - "User can join rooms with 99.5% success rate"
  - "Implement DynamoDB single-table design"
  - "Add real-time presence tracking with TTL"
- [ ] Don't cast votes yet (do this during recording)
- [ ] Keep this tab open for recording

### 4. Prepare Visual Assets (15 minutes)

**Screenshots/diagrams to show during video:**

- [ ] Create slide: "P2P Architecture" with red X's showing failure points
  - NAT traversal issues
  - Corporate firewalls
  - TURN server reliability
  - 50% success rate in big red text

- [ ] Create slide: "AppSync Architecture" with green checkmarks
  - HTTPS on port 443 (no NAT traversal)
  - AWS managed infrastructure
  - WebSocket subscriptions
  - 99.5% success rate in big green text
  - "99x improvement!" badge

- [ ] Optional: Simple diagram showing data flow:
  - User → AppSync → Lambda → DynamoDB
  - DynamoDB Streams → Tally Lambda
  - AppSync Subscriptions → All Users

### 5. Recording Setup (20 minutes)

**Technical Preparation:**

- [ ] Install OBS Studio, Loom, or QuickTime Screen Recording
- [ ] Test microphone audio quality (record 10 seconds, listen back)
- [ ] Test screen recording (record 10 seconds, verify quality)
- [ ] Set resolution: 1920x1080 minimum
- [ ] Set frame rate: 30fps minimum

**Environment Preparation:**

- [ ] Close all unnecessary browser tabs
- [ ] Close Slack, email, Discord (any notifications)
- [ ] Set Windows to "Do Not Disturb" mode
- [ ] Clear browser history/cookies for clean demo
- [ ] Set browser zoom to 100%
- [ ] Prepare VS Code with `.kiro/` directory open
- [ ] Prepare AWS Amplify Console tab (show successful deployment)
- [ ] Position windows for easy switching

**Demo Accounts Ready:**

- [ ] Account 1: Your main account (Moderator role)
- [ ] Account 2: Test account or incognito window (Member role)
- [ ] Both accounts signed in and ready

### 6. Script Review (15 minutes)

- [ ] Read through docs/hackathon/DEMO-VIDEO-OUTLINE-SCRIPT.md
- [ ] Practice talking points out loud (don't memorize, just familiarize)
- [ ] Time yourself: Aim for 4-5 minutes total
- [ ] Identify 3 key messages to emphasize:
  1. 99x improvement (50% → 99.5%)
  2. Works everywhere (no NAT traversal)
  3. Built with Kiro (spec-driven development)

---

## 🎬 Recording Day Checklist

**30 Minutes Before Recording:**

- [ ] Use bathroom (don't interrupt recording!)
- [ ] Get water (keep voice hydrated)
- [ ] Close all other apps
- [ ] Turn off phone or set to airplane mode
- [ ] Set computer to "Do Not Disturb"
- [ ] Test live demo one more time
- [ ] Clear throat, take deep breath

**Immediately Before Recording:**

- [ ] Open recording software
- [ ] Position microphone 6-8 inches from mouth
- [ ] Test audio levels (speak normally, check for clipping)
- [ ] Start recording
- [ ] Count to 3 silently (gives you buffer for editing)
- [ ] Begin with confidence!

---

## 📸 Post-Recording Tasks

**After Recording Video:**

- [ ] Watch full video for errors
- [ ] Check audio levels are consistent
- [ ] Verify all key points were covered
- [ ] Edit out long pauses, mistakes, loading times
- [ ] Add captions/subtitles (YouTube auto-captions OK)
- [ ] Add title card: "Scrum Reborn - 99x More Reliable Real-Time Scrum Collaboration"
- [ ] Add end card: GitHub URL + Live Demo URL
- [ ] Export: MP4, 1920x1080, H.264, 30fps

**Upload to YouTube:**

- [ ] Create YouTube account if needed
- [ ] Upload video
- [ ] Set visibility to "Unlisted" (NOT private!)
- [ ] Title: "Scrum Reborn - Real-Time Scrum Collaboration with AWS AppSync"
- [ ] Description: Include live demo URL and GitHub repo
- [ ] Test: Click video URL in incognito to verify it's accessible
- [ ] Copy YouTube URL for Devpost

**Take 8 Screenshots:**

On https://main.d3tvb88c55agb4.amplifyapp.com:

- [ ] 1. Sign-in page (clean, no errors)
- [ ] 2. Room lobby (showing room code and participants)
- [ ] 3. Planning poker - voting (votes hidden)
- [ ] 4. Planning poker - revealed (showing average)
- [ ] 5. Retrospective board (with sample notes)
- [ ] 6. Multi-device sync (split-screen or photo of two devices)

In your IDE/GitHub:

- [ ] 7. `.kiro/specs/` directory structure in VS Code
- [ ] 8. AWS Amplify Console showing successful deployment

**Update Submission Document:**

- [ ] Edit docs/hackathon/DEVPOST-SUBMISSION-FINAL.md
- [ ] Add YouTube URL to "Try it out" section
- [ ] Mark video checklist item as complete

---

## ✨ You're Ready!

**Everything automated is done. Now you just need to:**

1. ⏱️ **15 min**: Configure GitHub repo metadata
2. ⏱️ **15 min**: Test live demo end-to-end
3. ⏱️ **30 min**: Prepare demo room and visual assets
4. ⏱️ **20 min**: Set up recording environment
5. ⏱️ **2-3 hours**: Record, edit, upload video
6. ⏱️ **30 min**: Take screenshots
7. ⏱️ **30 min**: Submit to Devpost

**Total estimated time: 4-5 hours**

**Your Devpost submission text is ready at:**
`docs/hackathon/DEVPOST-SUBMISSION-FINAL.md`

**Your video script is ready at:**
`docs/hackathon/DEMO-VIDEO-OUTLINE-SCRIPT.md`

**Your reliability proof is documented at:**
`docs/metrics/RELIABILITY-METRICS.md`

---

**Good luck! You've got this! 🚀**
