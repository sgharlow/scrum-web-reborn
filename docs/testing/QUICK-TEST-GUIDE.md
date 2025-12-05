# Quick Test Guide - AppSync Integration

## ✅ What's Been Done

1. **Environment Configuration**
   - Created `.env` with deployed AppSync endpoints
   - Initialized AWS Amplify in `index.tsx`

2. **AppSync Integration**
   - Created `App.appsync.tsx` - simplified working version
   - Integrated auth, room operations, and subscriptions
   - Updated `index.tsx` to use AppSync version

3. **Build Status**
   - ✅ Build successful (471KB bundle)
   - No errors

## 🧪 How to Test

### Step 1: Start Dev Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Step 2: Sign In or Create Account

**Option A: Use Test User**
- Email: `demo@example.com`
- Password: `demo1234`

**Option B: Create New Account**
1. Click "Sign Up"
2. Enter email, password (min 8 chars, uppercase, lowercase, number, special char)
3. Check email for verification code
4. Enter code to confirm

### Step 3: Test Room Creation

1. After signing in, you'll see the lobby
2. Enter your display name
3. Click "Create New Room"
4. Room code will be generated (e.g., `ABC123` - 6 alphanumeric characters)
5. **✅ Success**: You should see the room interface

### Step 4: Test Multi-Device Join

1. **Device 1** (current window): Note the room code
2. **Device 2** (new window/phone):
   - Open same URL
   - Sign in (or create account)
   - Enter the room code from Device 1
   - Click "Join Room"
3. **✅ Success**: Both devices should show each other in participants list

### Step 5: Test Story Creation

1. Click "+ Add Story"
2. Enter title (e.g., "Test Story 1")
3. **✅ Success**: Story appears on all devices in real-time

### Step 6: Test Voting

1. Click "Vote" on a story
2. Enter a value (1, 2, 3, 5, 8, or 13)
3. **✅ Success**: Vote count updates on all devices

### Step 7: Test Vote Reveal

1. Click "Reveal Votes" on a story
2. **✅ Success**: Average vote shows on all devices
3. Click again to hide votes

## 🐛 Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Authentication Errors

**"User does not exist"**
- Create a new account via Sign Up

**"Incorrect username or password"**
- Double-check credentials or reset password in AWS Console

### Room Errors

**"Room code not found"**
- Make sure room code is exactly correct (case-sensitive)
- Try creating a new room

**"Only moderator can reveal votes"**
- First user to create room is moderator
- Other users can't reveal votes (this is correct behavior)

### Subscription Issues

**"Events not updating in real-time"**
- Check browser console for WebSocket errors
- Verify GraphQL endpoint in `.env` is correct
- Check network tab for subscription connections

## 📊 Success Criteria

- [ ] Can sign in successfully
- [ ] Can create a room (gets room code)
- [ ] Can join room from second device
- [ ] Both devices show each other in participants
- [ ] Story creation shows on both devices within 1 second
- [ ] Vote casting updates count on both devices
- [ ] Vote reveal shows average on both devices
- [ ] Connection indicator shows green/connected

## 🎯 Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Join latency | <2s | Time from "Join Room" to seeing room |
| Subscription latency | <250ms | Time from action to update on other device |
| Vote tally latency | <2s | Time from vote to avgVote update |

## 📝 Test Checklist

### Authentication
- [ ] Sign up new user
- [ ] Confirm email
- [ ] Sign in
- [ ] Sign out and sign in again

### Room Operations
- [ ] Create room
- [ ] Room code displayed
- [ ] Join room with code
- [ ] Leave room
- [ ] Rejoin same room

### Story Management
- [ ] Add story
- [ ] Story appears on all devices
- [ ] Multiple stories visible
- [ ] Stories persist after page refresh

### Voting
- [ ] Cast vote on story
- [ ] Vote count increments
- [ ] Multiple users vote
- [ ] Reveal votes (moderator only)
- [ ] Average calculated correctly
- [ ] Hide votes again

### Real-Time Sync
- [ ] Two devices see each other
- [ ] Story added on Device 1 appears on Device 2
- [ ] Vote on Device 2 updates Device 1
- [ ] Reveal on Device 1 updates Device 2
- [ ] Latency <1 second

## 🔧 Advanced Testing

### Test Connection Resilience

1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Perform actions
4. **✅ Success**: Actions still work, just slower

### Test Reconnection

1. Open DevTools → Network tab
2. Toggle "Offline" mode for 5 seconds
3. Toggle back online
4. **✅ Success**: Connection indicator goes red, then green

### Test Concurrent Actions

1. On Device 1 and Device 2 simultaneously:
2. Both click "Vote" on same story
3. Enter different values
4. Both click "Vote" at same time
5. **✅ Success**: Both votes registered, average correct

## 📸 Demo Recording Tips

1. **Setup**: Two browser windows side-by-side
2. **Narration**:
   - "Creating room with code DEMO-1234"
   - "Joining from second device... instant sync"
   - "Adding story... appears on both devices immediately"
   - "Casting votes... see the real-time updates"
   - "Revealing votes... average calculated instantly"
3. **Highlight**: Connection indicator stays green throughout
4. **Compare**: Show old PeerJS version failing (if available)

## 🚀 Next Steps

If all tests pass:

1. Replace `App.tsx` with AppSync version (or rename)
2. Remove PeerJS dependencies
3. Update README with new setup instructions
4. Record demo video
5. Submit to hackathon!

## 🆘 Getting Help

If tests fail:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify `.env` file has correct endpoints
4. Check `infra/DEPLOYMENT-OUTPUTS.md` for reference values
5. Review CloudWatch logs in AWS Console

---

**Last Updated**: 2025-11-14
**Status**: Ready for Testing
**Estimated Test Time**: 15-30 minutes
