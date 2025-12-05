# User Experience Testing Checklist

**Purpose:** Validate all features work before hackathon submission
**Time Required:** 30-45 minutes
**Environment:** Local (`npm run dev`) OR Deployed (Amplify URL)

---

## Prerequisites

- [ ] App is running (local or deployed)
- [ ] You have 2 test user accounts created in Cognito
- [ ] You have 2 devices or browser windows ready (laptop + phone OR 2 browser windows)

---

## Test Section 1: Authentication Flow (5 minutes)

### Test 1.1: Sign Up New User ✅

**Steps:**
1. Open app in incognito/private window
2. Click "Sign Up" tab
3. Enter:
   - Email: `testuser1@example.com`
   - Password: `TestPass123!`
   - Name: `Test User 1`
4. Click "Sign Up"

**Expected Result:**
- ✅ See "Verification code sent to email" message
- ✅ Receive email with 6-digit code
- ✅ Enter code and get "Account confirmed" message

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 1.2: Sign In Existing User ✅

**Steps:**
1. Close app and reopen
2. Enter email and password from test 1.1
3. Click "Sign In"

**Expected Result:**
- ✅ Successfully authenticated
- ✅ See lobby screen with "Create / Join Room" button
- ✅ Name is pre-filled or can be entered

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 1.3: Sign Out ✅

**Steps:**
1. Look for "Sign Out" button (usually top-right)
2. Click it

**Expected Result:**
- ✅ Redirected to sign-in page
- ✅ Cannot access room without re-authenticating

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 2: Room Creation & Joining (10 minutes)

### Test 2.1: Create New Room (Auto-Generated Code) ✅

**Steps:**
1. Sign in as User 1
2. Enter display name: `Alice`
3. Leave room code field BLANK
4. Click "Create / Join Room"

**Expected Result:**
- ✅ Room created with auto-generated code (format: `SOLAR-COMET-123`)
- ✅ Entered room successfully
- ✅ See participant list with your name
- ✅ See "You are the facilitator" indicator (crown icon or similar)

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

**Room Code:** `_____________` (write down for next test)

---

### Test 2.2: Join Existing Room from Second Device ✅

**Devices:** Laptop (User 1) + Phone (User 2)

**Steps:**
1. On second device/window, open app
2. Sign in as User 2 (different account)
3. Enter display name: `Bob`
4. Enter room code from Test 2.1
5. Click "Create / Join Room"

**Expected Result:**
- ✅ Joined room successfully
- ✅ See participant list with BOTH users (Alice + Bob)
- ✅ On Device 1 (Alice's screen), Bob appears in participant list **automatically** (real-time subscription)
- ✅ Bob sees Alice in participant list

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 2.3: Create Room with Custom Code ✅

**Steps:**
1. Sign out from both devices
2. Sign in on Device 1 as User 1
3. Enter display name: `Charlie`
4. Enter custom room code: `KIRO24`
5. Click "Create / Join Room"

**Expected Result:**
- ✅ Room created with custom code `KIRO24`
- ✅ Can share code with others

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 3: Presence Tracking (5 minutes)

### Test 3.1: Real-Time Presence Updates ✅

**Devices:** Laptop + Phone (both in same room)

**Steps:**
1. Both users in same room (from Test 2.2)
2. On Device 2 (Bob), close browser tab
3. Wait 30 seconds
4. On Device 1 (Alice), check participant list

**Expected Result:**
- ✅ Bob's presence changes from "ONLINE" to "OFFLINE" or disappears
- ⏱️ Update happens within 30-60 seconds (heartbeat + TTL)

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 3.2: Re-Joining Updates Presence ✅

**Steps:**
1. On Device 2 (Bob), rejoin same room with code
2. On Device 1 (Alice), check participant list

**Expected Result:**
- ✅ Bob reappears in participant list
- ✅ Shows as "ONLINE"

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 4: Planning Poker - Story Management (10 minutes)

### Test 4.1: Create Story (Facilitator Only) ✅

**Steps:**
1. On Device 1 (Alice - facilitator), find "Add Story" button
2. Enter story title: `User can sign in with email`
3. (Optional) Enter description: `Implement Cognito authentication`
4. Click "Create" or "Add"

**Expected Result:**
- ✅ Story appears in story list on Device 1
- ✅ Story appears on Device 2 (Bob's screen) **automatically** (real-time subscription)
- ✅ Story has unique ID

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 4.2: Cast Vote on Story ✅

**Devices:** Both devices (Alice + Bob)

**Steps:**
1. On Device 1 (Alice), click vote button (e.g., "5 points")
2. On Device 2 (Bob), click vote button (e.g., "8 points")

**Expected Result:**
- ✅ Vote is recorded
- ✅ Vote count increments (e.g., "2 votes cast")
- ✅ Votes are HIDDEN until revealed
- ✅ Vote count updates on both devices **automatically** (within 1-2 seconds via tally processor)

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 4.3: Reveal Votes (Facilitator Only) ✅

**Steps:**
1. After both users vote (Test 4.2)
2. On Device 1 (Alice - facilitator), click "Reveal Votes" button

**Expected Result:**
- ✅ Votes revealed on both devices simultaneously
- ✅ Shows individual votes: Alice (5), Bob (8)
- ✅ Shows average: 6.5 points
- ✅ Shows consensus indicator (e.g., "Low consensus" due to 3-point spread)

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 4.4: Retract Vote ✅

**Steps:**
1. Before revealing votes, on Device 1 (Alice), click "Retract Vote" or change vote
2. Change vote from 5 to 3

**Expected Result:**
- ✅ Vote updated
- ✅ Vote count remains the same (still 2 votes)
- ✅ On reveal, shows new vote (3 instead of 5)

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 4.5: Special Cards (Coffee/Unknown) ✅

**Steps:**
1. Create new story
2. On Device 1 (Alice), vote "☕" (coffee - need a break)
3. On Device 2 (Bob), vote "❓" (unknown - need more info)

**Expected Result:**
- ✅ Special cards recorded
- ✅ On reveal, special cards shown but NOT included in average calculation
- ✅ Average shows "N/A" or "No numeric votes"

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 5: Retrospective Mode (10 minutes)

### Test 5.1: Switch to Retro Mode ✅

**Steps:**
1. On Device 1 (Alice - facilitator), find "Change Stage" or "Retro Mode" button
2. Click to switch from VOTING to RETRO

**Expected Result:**
- ✅ Mode changes to Retrospective
- ✅ UI switches from voting cards to retro board
- ✅ Device 2 (Bob) automatically updates to retro mode (subscription)
- ✅ See three categories: "Went Well", "To Improve", "Action Items"

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 5.2: Add Retro Note ✅

**Steps:**
1. On Device 1 (Alice), click "Add note" in "Went Well" category
2. Enter text: `AppSync eliminated NAT traversal issues`
3. Submit note

**Expected Result:**
- ✅ Note appears in "Went Well" column on Device 1
- ✅ Note appears on Device 2 (Bob's screen) **automatically** (real-time subscription)
- ✅ Note shows author (Alice)

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 5.3: Upvote Retro Note ✅

**Steps:**
1. On Device 2 (Bob), find Alice's note from Test 5.2
2. Click upvote/+1 button

**Expected Result:**
- ✅ Vote count increments (e.g., from 0 to 1)
- ✅ Update appears on both devices
- ✅ Bob can see he voted (indicator like "You voted")

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 5.4: Add Notes in Multiple Categories ✅

**Steps:**
1. On Device 1 (Alice), add note in "To Improve": `Need better error messages`
2. On Device 2 (Bob), add note in "Action Items": `Set up monitoring dashboard`

**Expected Result:**
- ✅ Both notes appear in correct categories
- ✅ All notes visible on both devices
- ✅ Categories stay organized

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 6: Multi-Device Real-Time Sync (Critical for Demo!) (5 minutes)

### Test 6.1: Simultaneous Actions ✅

**Purpose:** Verify real-time synchronization works under concurrent load

**Steps:**
1. Both devices in VOTING mode
2. Create story on Device 1
3. **Within 2 seconds**, both users cast votes simultaneously
4. Reveal votes on Device 1

**Expected Result:**
- ✅ Both votes recorded (no conflicts)
- ✅ Vote count shows 2
- ✅ Both votes appear on reveal
- ✅ No duplicate votes
- ✅ No lost votes

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 6.2: Subscription Latency Test ⏱️

**Purpose:** Measure real-time update latency (target: <250ms)

**Steps:**
1. On Device 1, prepare to create a story
2. On Device 2, watch the story list
3. On Device 1, click "Add Story" and submit
4. **Start timer** when you click submit on Device 1
5. **Stop timer** when story appears on Device 2

**Expected Result:**
- ✅ Story appears on Device 2 in under 2 seconds (ideally <500ms)
- ✅ No refresh needed
- ✅ Automatic subscription update

**Measured Latency:** `_________` seconds

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 7: Error Handling & Edge Cases (5 minutes)

### Test 7.1: Invalid Room Code ✅

**Steps:**
1. Sign out and sign back in
2. Enter non-existent room code: `XXXYYY`
3. Try to join

**Expected Result:**
- ✅ Shows error: "Room not found" or "Invalid room code"
- ✅ User-friendly error message (not raw GraphQL error)
- ✅ Can retry with correct code

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 7.2: Network Disconnection (Optional) ✅

**Steps:**
1. Join room on Device 1
2. Open DevTools → Network tab → Throttle to "Offline"
3. Try to cast vote
4. Re-enable network

**Expected Result:**
- ✅ Shows connection status indicator ("disconnected" or "reconnecting")
- ✅ When network restored, shows "connected"
- ✅ (Ideally) Retry failed operations automatically

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 7.3: Non-Facilitator Restrictions ✅

**Steps:**
1. On Device 2 (Bob - not facilitator), try to:
   - Reveal votes (if button visible)
   - Delete a story (if button visible)
   - Change room stage

**Expected Result:**
- ✅ Either buttons are disabled/hidden for non-facilitators
- ✅ OR clicking shows error: "Only facilitator can perform this action"
- ✅ Alice (facilitator) CAN perform these actions

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 8: Browser Compatibility (Optional but Recommended) (5 minutes)

### Test 8.1: Chrome ✅

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

### Test 8.2: Firefox ✅

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

### Test 8.3: Safari ✅

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

### Test 8.4: Mobile Browser (iOS Safari or Android Chrome) ✅

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Test Section 9: Performance & Monitoring (Browser DevTools)

### Test 9.1: Check Network Requests ✅

**Steps:**
1. Open DevTools → Network tab
2. Perform various actions (create room, vote, etc.)
3. Check network activity

**Expected Result:**
- ✅ See GraphQL requests to AppSync endpoint (e.g., `appsync-api.us-east-1.amazonaws.com`)
- ✅ See WebSocket connection (WS protocol) for subscriptions
- ❌ NO requests to PeerJS servers
- ❌ NO requests to TURN servers
- ✅ Most requests complete in <500ms

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

### Test 9.2: Check Console for Errors ✅

**Steps:**
1. Open DevTools → Console tab
2. Perform various actions
3. Check for errors

**Expected Result:**
- ✅ No red error messages
- ✅ May see info/debug logs (acceptable)
- ❌ No "uncaught exception" errors
- ❌ No "CORS" errors

**Status:** [ ] PASS [ ] FAIL [ ] SKIP

---

## Critical Issues Found

**Document any critical failures here:**

| Test | Issue | Severity | Status |
|------|-------|----------|--------|
| Example: 4.2 | Votes not syncing | High | Fixed |
|  |  |  |  |
|  |  |  |  |

---

## Summary

**Total Tests:** 27
**Passed:** `____` / 27
**Failed:** `____` / 27
**Skipped:** `____` / 27

**Overall Status:** [ ] READY FOR DEMO [ ] NEEDS FIXES [ ] NOT TESTED

---

## Recommended Actions Before Hackathon Submission

**If 90%+ tests pass (24/27):**
- ✅ Ready for video demo
- ✅ Document known issues in README "Limitations" section

**If 70-89% tests pass (19-23/27):**
- ⚠️ Fix critical issues (room creation, voting, real-time sync)
- ✅ Proceed with submission but note limitations

**If <70% tests pass (<19/27):**
- 🔴 Do NOT submit yet
- 🔴 Fix critical functionality first
- 🔴 Re-test before submission

---

## For Demo Video

**After testing, document:**
- ✅ Room code to use in demo: `____________`
- ✅ Test users to use: `alice@demo.com` / `bob@demo.com`
- ✅ Story example: `User can join rooms with 99.5% success rate`
- ✅ Retro note example: `AppSync eliminated NAT traversal issues`
- ✅ Measured subscription latency: `_______` ms

---

**Checklist Version:** 1.0
**Created:** 2025-11-15
**Estimated Time:** 30-45 minutes
