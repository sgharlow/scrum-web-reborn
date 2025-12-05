# Multi-Device Synchronization Testing Guide

## Prerequisites

1. **Infrastructure Deployed**: Ensure CDK stack is deployed and outputs are in `.env.local`
2. **Frontend Running**: Start dev server with `npm run dev`
3. **Test User**: Use credentials from `infra/DEPLOYMENT-OUTPUTS.md`
   - Email: testuser@example.com
   - Password: TestPass123!

## Test Setup

### Browser Configuration
- **Window A**: Chrome (or your primary browser)
- **Window B**: Chrome Incognito (or different browser)
- **DevTools**: Open Network tab in both windows

### Authentication
1. Sign in with test user in both windows
2. Verify JWT token in Network tab (Authorization header)

## Test Scenarios

### 1. Room Creation and Joining

**Window A (Facilitator)**:
1. Create a new room with code "Test-Room-123"
2. Verify room appears in UI
3. Check Network tab for `createRoom` mutation
4. Copy room URL

**Window B (Participant)**:
1. Join room using code "Test-Room-123"
2. Verify `joinRoom` mutation in Network tab
3. Confirm participant appears in Window A's participant list

**Expected Results**:
- ✅ Both windows show same room code
- ✅ Participant list shows 2 members
- ✅ Facilitator has crown icon
- ✅ Connection status shows "Connected"

### 2. Real-Time Story Creation

**Window A (Facilitator)**:
1. Add story: "Implement user authentication"
2. Observe Network tab for `createStory` mutation
3. Note the latency in DevTools

**Window B (Participant)**:
1. Watch for story to appear automatically
2. Check Network tab for `onStoryCreated` subscription event
3. Measure time from Window A action to Window B update

**Expected Results**:
- ✅ Story appears in Window B within 250ms (p95 target)
- ✅ Story has same ID in both windows
- ✅ No page refresh needed

### 3. Voting Flow

**Window A (Facilitator)**:
1. Select the story
2. Click "Start Voting"
3. Cast vote: 5 points

**Window B (Participant)**:
1. Verify voting UI activates automatically
2. Cast vote: 8 points
3. Check Network tab for `castVote` mutation

**Window A (Facilitator)**:
1. Verify vote count shows 2/2
2. Click "Reveal Votes"
3. Check Network tab for `revealVotes` mutation

**Both Windows**:
1. Verify votes are revealed simultaneously
2. Check that median estimate is calculated
3. Confirm story shows estimate badge

**Expected Results**:
- ✅ Vote count updates in real-time
- ✅ Votes remain hidden until revealed
- ✅ Reveal happens simultaneously (within 250ms)
- ✅ Estimate calculation is correct

### 4. Presence Heartbeat

**Both Windows**:
1. Open browser console
2. Look for "Presence heartbeat started" message
3. Wait 30 seconds
4. Verify heartbeat logs appear every 30s

**Window B**:
1. Close the tab
2. Wait 90 seconds (TTL period)

**Window A**:
1. Verify participant is removed from list after TTL

**Expected Results**:
- ✅ Heartbeat sends every 30 seconds
- ✅ Network tab shows `setPresence` mutations
- ✅ Participant removed after 90s of inactivity
- ✅ No errors in console

### 5. Retrospective Mode

**Window A (Facilitator)**:
1. Switch to "Retrospective" mode
2. Add retro note in "What went well?": "Great teamwork"

**Window B (Participant)**:
1. Verify mode switch happens automatically
2. Add retro note in "To improve": "Better documentation"
3. Vote on Window A's note

**Window A**:
1. Verify vote count updates in real-time
2. Click sort button
3. Verify notes reorder by votes

**Expected Results**:
- ✅ Mode switch syncs across devices
- ✅ Retro notes appear in real-time
- ✅ Vote counts update immediately
- ✅ Sorting works correctly

### 6. Connection Resilience

**Window B**:
1. Open DevTools > Network tab
2. Enable "Offline" mode for 10 seconds
3. Try to cast a vote (should fail)
4. Disable "Offline" mode
5. Verify reconnection happens automatically

**Expected Results**:
- ✅ Connection status shows "Disconnected"
- ✅ UI shows reconnection attempt
- ✅ Connection restores automatically
- ✅ State syncs after reconnection

### 7. Optimistic Updates

**Window A**:
1. Create a story
2. Immediately observe UI update (before server response)
3. Check Network tab for mutation timing

**If mutation fails** (simulate by disconnecting):
1. Verify story appears immediately (optimistic)
2. Verify story disappears after error (rollback)
3. Check for error message

**Expected Results**:
- ✅ UI updates instantly (< 50ms)
- ✅ Server confirmation follows (< 500ms)
- ✅ Rollback works on error
- ✅ Error message is user-friendly

## Performance Metrics

### Latency Measurements

Use browser DevTools Performance tab:

1. **Pub/Sub Latency** (p95 target: ≤250ms)
   - Measure: Time from mutation in Window A to subscription update in Window B
   - How: Compare timestamps in Network tab

2. **Vote Tally Latency** (p95 target: ≤2s)
   - Measure: Time from last vote to tally completion
   - How: Check DynamoDB Streams processing time

3. **Presence Freshness** (target: ≤30s)
   - Measure: Time between heartbeats
   - How: Check console logs or Network tab

### Recording Results

Create a table:

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Story creation sync | ≤250ms | ___ ms | ___ |
| Vote cast sync | ≤250ms | ___ ms | ___ |
| Vote reveal sync | ≤250ms | ___ ms | ___ |
| Retro note sync | ≤250ms | ___ ms | ___ |
| Presence heartbeat | 30s | ___ s | ___ |
| Vote tally | ≤2s | ___ s | ___ |

## Troubleshooting

### Issue: Subscriptions not working
- Check: WebSocket connection in Network tab (filter: WS)
- Verify: Authorization header is present
- Solution: Refresh auth token or re-authenticate

### Issue: High latency (>500ms)
- Check: Network tab for slow mutations
- Verify: Lambda cold start (first request is slower)
- Solution: Warm up Lambdas or increase provisioned concurrency

### Issue: Presence not updating
- Check: Console for heartbeat logs
- Verify: `setPresence` mutations in Network tab
- Solution: Ensure heartbeat interval is running

### Issue: State desync between windows
- Check: Subscription events in Network tab
- Verify: Both windows subscribed to same room
- Solution: Refresh both windows and rejoin room

## Success Criteria

All tests must pass with:
- ✅ 99.5% success rate for mutations
- ✅ p95 latency ≤250ms for real-time updates
- ✅ Presence heartbeat every 30s
- ✅ No console errors
- ✅ Optimistic updates with rollback working
- ✅ Connection resilience demonstrated

## Reporting

Document results in:
- `TEST-RESULTS.md` with screenshots
- Performance metrics table
- Any issues encountered
- Recommendations for improvements
