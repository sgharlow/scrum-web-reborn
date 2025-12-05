# End-to-End Testing Plan

**Duration**: 30 minutes  
**Goal**: Verify full room flow works with real-time synchronization

---

## Prerequisites

- [ ] AWS infrastructure deployed (`cdk deploy` completed)
- [ ] Stack outputs captured (GraphQL URL, Cognito IDs)
- [ ] Frontend environment variables configured (`.env.local`)
- [ ] Two devices/browsers available for testing

---

## Test Environment Setup (5 minutes)

### 1. Verify Infrastructure

```bash
# Check CDK stack status
cd infra
aws cloudformation describe-stacks --stack-name ScrumRealtimeStack --query 'Stacks[0].StackStatus'

# Should return: CREATE_COMPLETE or UPDATE_COMPLETE
```

### 2. Verify Frontend Configuration

```bash
# Check environment variables
cat .env.local

# Should contain:
# VITE_AWS_REGION=us-east-1
# VITE_GRAPHQL_ENDPOINT=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
# VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
# VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Start Frontend

```bash
# Terminal 1: Start dev server
npm run dev

# Should open at http://localhost:5173
```

---

## Test Scenario 1: Authentication Flow (5 minutes)

### Device A: Sign Up

- [ ] Open http://localhost:5173
- [ ] Click "Sign Up"
- [ ] Enter email: `alice@test.local`
- [ ] Enter password: `Test1234!`
- [ ] Click "Sign Up"
- [ ] Check email for verification code (or use AWS Console to confirm)
- [ ] Enter verification code
- [ ] Verify redirect to app

### Device A: Sign In

- [ ] Sign out if needed
- [ ] Click "Sign In"
- [ ] Enter email: `alice@test.local`
- [ ] Enter password: `Test1234!`
- [ ] Click "Sign In"
- [ ] Verify successful authentication

### Device B: Create Second User

- [ ] Open http://localhost:5173 in incognito/second browser
- [ ] Sign up as `bob@test.local` / `Test1234!`
- [ ] Confirm and sign in

**Success Criteria**:
- ✅ Both users authenticated
- ✅ JWT tokens received
- ✅ No console errors

---

## Test Scenario 2: Room Creation & Join (5 minutes)

### Device A: Create Room

- [ ] Click "Create Room" or navigate to room creation
- [ ] Enter room name: `Sprint 42 Planning`
- [ ] Enter room code: `DEMO01`
- [ ] Click "Create"
- [ ] Verify room created
- [ ] Note the room code displayed

**Measure**: Time from click to room created (target: <2s)

### Device B: Join Room

- [ ] Click "Join Room"
- [ ] Enter room code: `DEMO01`
- [ ] Enter display name: `Bob`
- [ ] Click "Join"
- [ ] Verify joined successfully

**Measure**: Time from click to joined (target: <2s)

### Verify Presence Synchronization

- [ ] **Device A**: Verify Bob appears in participant list
- [ ] **Device B**: Verify Alice appears in participant list
- [ ] **Both**: Verify presence indicators show "Online"

**Measure**: Time from join to presence update (target: <250ms)

**Success Criteria**:
- ✅ Room created successfully
- ✅ Join by code works
- ✅ Presence syncs in real-time
- ✅ Both users see each other

---

## Test Scenario 3: Story Creation & Voting (10 minutes)

### Device A: Create Story

- [ ] Click "Add Story" or navigate to story creation
- [ ] Enter title: `User can join rooms with 99.5% success`
- [ ] Enter description: `Migrate from P2P to AppSync`
- [ ] Add tags: `backend`, `infrastructure`
- [ ] Click "Create"
- [ ] Verify story appears

**Measure**: Time from click to story appears (target: <1s)

### Verify Story Synchronization

- [ ] **Device B**: Verify story appears automatically
- [ ] **Both**: Verify story details match

**Measure**: Time from create to Device B sees story (target: <250ms)

### Device A: Cast Vote

- [ ] Click on story to start voting
- [ ] Select vote value: `5`
- [ ] Click "Vote"
- [ ] Verify vote cast (checkmark appears)
- [ ] Verify vote value is hidden

**Measure**: Time from click to vote confirmed (target: <500ms)

### Device B: Cast Vote

- [ ] Select vote value: `8`
- [ ] Click "Vote"
- [ ] Verify vote cast

### Verify Vote Synchronization

- [ ] **Device A**: Verify Bob's vote indicator appears (checkmark, no value)
- [ ] **Device B**: Verify Alice's vote indicator appears
- [ ] **Both**: Verify vote count shows "2 votes"

**Measure**: Time from vote to count update (target: <2s)

### Device A: Reveal Votes (Moderator Only)

- [ ] Click "Reveal Votes"
- [ ] Verify all votes revealed
- [ ] Verify Alice: 5, Bob: 8
- [ ] Verify average displayed: 6.5

**Measure**: Time from reveal to votes shown (target: <250ms)

### Verify Reveal Synchronization

- [ ] **Device B**: Verify votes revealed automatically
- [ ] **Both**: Verify same values displayed
- [ ] **Both**: Verify average matches

**Success Criteria**:
- ✅ Story creation syncs in real-time
- ✅ Votes cast successfully
- ✅ Vote counts update automatically
- ✅ Reveal syncs to all participants
- ✅ Vote tally computed correctly

---

## Test Scenario 4: Retrospective (3 minutes)

### Device A: Switch to Retro Mode

- [ ] Click "Retro" or change room stage to "RETRO"
- [ ] Verify stage change

### Device B: Verify Stage Change

- [ ] Verify UI switches to retro mode automatically

**Measure**: Time from stage change to Device B updates (target: <250ms)

### Device A: Add Retro Note

- [ ] Select category: "WENT_WELL"
- [ ] Enter text: `AppSync eliminated NAT traversal issues`
- [ ] Click "Add"
- [ ] Verify note appears

### Device B: Verify Note Synchronization

- [ ] Verify note appears automatically

### Device B: Vote on Retro Note

- [ ] Click upvote on Alice's note
- [ ] Verify vote count increments

### Device A: Verify Vote Synchronization

- [ ] Verify vote count updated to 1

**Success Criteria**:
- ✅ Stage change syncs in real-time
- ✅ Retro notes sync automatically
- ✅ Retro votes sync in real-time

---

## Test Scenario 5: Presence Heartbeat (2 minutes)

### Monitor Presence

- [ ] Open browser DevTools → Network tab
- [ ] Filter for GraphQL requests
- [ ] Wait 30 seconds
- [ ] Verify `setPresence` mutation sent every 30s
- [ ] Verify no errors

### Test Disconnect/Reconnect

- [ ] **Device B**: Close browser tab
- [ ] **Device A**: Wait 5 minutes
- [ ] **Device A**: Verify Bob's presence changes to "Offline" or disappears
- [ ] **Device B**: Reopen and rejoin room
- [ ] **Device A**: Verify Bob reappears as "Online"

**Success Criteria**:
- ✅ Heartbeat sent every 30 seconds
- ✅ TTL cleanup works (5 minutes)
- ✅ Reconnection works

---

## Performance Measurements

Record these metrics during testing:

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Room creation time | <2s | _____ | ☐ |
| Join room time | <2s | _____ | ☐ |
| Presence sync latency | <250ms | _____ | ☐ |
| Story creation sync | <250ms | _____ | ☐ |
| Vote cast confirmation | <500ms | _____ | ☐ |
| Vote tally update | <2s | _____ | ☐ |
| Vote reveal sync | <250ms | _____ | ☐ |
| Stage change sync | <250ms | _____ | ☐ |
| Retro note sync | <250ms | _____ | ☐ |
| Heartbeat interval | 30s | _____ | ☐ |

---

## Troubleshooting

### Issue: "Network Error" or "Unauthorized"

**Solution**:
1. Check `.env.local` has correct values
2. Verify Cognito user is confirmed
3. Sign out and sign in again
4. Check browser console for detailed error

### Issue: Subscriptions Not Working

**Solution**:
1. Open DevTools → Network → WS (WebSocket)
2. Verify WebSocket connection established
3. Check for connection errors
4. Verify AppSync API is deployed

### Issue: Votes Not Tallying

**Solution**:
1. Check CloudWatch Logs: `/aws/lambda/scrum-reborn-tally-processor`
2. Verify DynamoDB Streams enabled
3. Check Dead Letter Queue for failed batches
4. Verify tally Lambda has DynamoDB permissions

### Issue: High Latency

**Solution**:
1. Check CloudWatch metrics for Lambda cold starts
2. Verify DynamoDB not throttling
3. Check network latency (ping AWS region)
4. Consider provisioned concurrency for Lambdas

---

## Test Results Summary

### Overall Status

- [ ] All test scenarios passed
- [ ] All performance targets met
- [ ] No critical errors
- [ ] Ready for demo

### Issues Found

List any issues discovered:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Next Steps

- [ ] Fix any critical issues
- [ ] Re-test failed scenarios
- [ ] Document workarounds for known issues
- [ ] Proceed to demo video recording

---

## CloudWatch Verification (Optional)

### Check Metrics

```bash
# View custom metrics
aws cloudwatch list-metrics --namespace ScrumReborn

# Get mutation latency
aws cloudwatch get-metric-statistics \
  --namespace ScrumReborn \
  --metric-name MutationLatency \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum \
  --dimensions Name=Operation,Value=joinRoom
```

### Check Logs

```bash
# View mutations Lambda logs
aws logs tail /aws/lambda/scrum-reborn-mutations --follow

# View tally Lambda logs
aws logs tail /aws/lambda/scrum-reborn-tally-processor --follow
```

---

**Test Plan Version**: 1.0  
**Created**: 2025-11-14  
**Duration**: 30 minutes  
**Status**: Ready for Execution
