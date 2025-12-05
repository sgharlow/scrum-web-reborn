# Design Document: AppSync Infrastructure Migration

## Overview

This design document describes the architecture for migrating Scrum Reborn from a P2P WebRTC architecture to a serverless AWS AppSync + DynamoDB architecture. The solution eliminates NAT traversal issues and provides guaranteed 99.5%+ connectivity through managed AWS services.

### Key Design Goals

1. **Reliability**: Achieve 99.5%+ connectivity success rate
2. **Low Latency**: <250ms p95 for pub/sub delivery, <2s p95 for vote tally updates
3. **Scalability**: Support unlimited concurrent rooms and participants
4. **Maintainability**: Infrastructure as code with automated deployment
5. **Security**: JWT-based authentication with role-based access control

## Architecture

### High-Level Architecture Diagram

```
┌─────────────┐                              ┌─────────────┐
│   Client A  │◄────────┐                ┌──►│   Client B  │
│  (Browser)  │         │                │   │  (Browser)  │
└─────────────┘         │                │   └─────────────┘
                        │                │
                   ┌────▼────────────────▼────┐
                   │   AWS AppSync (GraphQL)  │
                   │  WebSocket Subscriptions │
                   │    99.5% Connectivity    │
                   └────┬────────────────┬────┘
                        │                │
         ┌──────────────▼────┐    ┌─────▼──────────┐
         │ Lambda Resolvers  │    │ Cognito Auth   │
         │  (Mutations/Queries) │  │  (User Pools)  │
         └──────────┬──────────┘  └────────────────┘
                    │
         ┌──────────▼──────────────┐
         │   DynamoDB Single Table │
         │   PK: ROOM#id           │
         │   SK: STORY#id / VOTE#  │
         └──────────┬──────────────┘
                    │
         ┌──────────▼──────────────┐
         │   DynamoDB Streams      │
         │  (Vote Tally Processor) │
         └─────────────────────────┘
```

### Technology Stack

- **API Layer**: AWS AppSync (GraphQL with WebSocket subscriptions)
- **Compute**: AWS Lambda (Node.js 20, bundled with esbuild)
- **Database**: DynamoDB (single-table design, on-demand billing)
- **Authentication**: Cognito User Pools (JWT tokens)
- **Infrastructure**: AWS CDK (TypeScript)
- **CI/CD**: GitHub Actions
- **Frontend**: React 19 + AWS Amplify

## Components and Interfaces

### 1. AWS CDK Stack

**Purpose**: Define and deploy all AWS infrastructure as code

**Key Resources**:
- `ScrumRealtimeStack` - Main CDK stack
- Cognito User Pool with email sign-in
- DynamoDB table with streams enabled
- AppSync GraphQL API
- Lambda functions (mutations resolver, tally processor)
- IAM roles and policies
- CloudWatch log groups

**Configuration**:
```typescript
{
  region: 'us-east-1',
  billingMode: 'PAY_PER_REQUEST',
  streamViewType: 'NEW_AND_OLD_IMAGES',
  ttlAttribute: 'ttl',
  logRetention: '7 days'
}
```

### 2. GraphQL Schema

**Purpose**: Define the API contract for all client-server interactions

**Key Types**:
- `Room` - Collaborative session space
- `Member` - Participant with presence
- `Story` - User story to estimate
- `Vote` - Individual estimate
- `RetroNote` - Retrospective feedback

**Mutations**:
- Room: `createRoom`, `setRoomStage`, `joinRoom`, `leaveRoom`
- Presence: `setPresence`
- Stories: `createStory`, `updateStory`, `deleteStory`
- Votes: `castVote`, `retractVote`, `revealVotes`
- Retro: `addRetroNote`, `voteRetroNote`

**Queries**:
- `getRoom(id)`, `getRoomByCode(code)`, `listRooms`
- `getStory(roomId, storyId)`, `listStories(roomId)`
- `listRetro(roomId)`

**Subscriptions**:
- `onRoomEvent(roomId)` - All room events (union type)
- `onStoryChanged(roomId)` - Story CRUD events
- `onVoteChanged(roomId, storyId)` - Vote events
- `onPresenceChanged(roomId)` - Member presence updates
- `onStageChanged(roomId)` - Room stage transitions

**Subscription Wiring**:
Uses `@aws_subscribe` directive to automatically publish mutation results to subscribers.

### 3. Lambda Mutations Resolver

**Purpose**: Handle all GraphQL mutations and queries

**Runtime**: Node.js 20 with AWS SDK v3
**Memory**: 256 MB
**Timeout**: 15 seconds
**Bundling**: esbuild (single-file output)

**Key Functions**:
- `createRoom` - Generate UUID, validate code (6 chars uppercase alphanumeric), write room record AND GSI1 mapping (GSI1PK=ROOM_CODE#code, GSI1SK=ROOM#id, GSI1PK=USER#userId)
- `joinRoom` - Lookup room by code via GSI1 query, create presence with 300s TTL
- `listRooms` - Query user's rooms via GSI1 (GSI1PK=USER#userId)
- `castVote` - Validate vote value against allowed set ["1","2","3","5","8","13","21","☕","❓"], upsert vote record
- `revealVotes` - Verify user has MODERATOR role, then set story.revealed flag
- `setPresence` - Update presence with fresh TTL (300s)

**Error Handling**:
- Conditional writes for uniqueness constraints
- Friendly error messages for user-facing errors
- Structured logging with context (roomId, userId, action)

**Authorization**:
- Extract userId from `ctx.identity.sub`
- Check role claims for moderator-only actions
- Return 403 for unauthorized operations

### 4. DynamoDB Tally Processor

**Purpose**: Asynchronously compute vote aggregates when votes change

**Trigger**: DynamoDB Streams (batch size 50, bisect on error)
**Runtime**: Node.js 20
**Memory**: 256 MB
**Timeout**: 30 seconds

**Processing Logic**:
1. Filter stream records for `VOTE#*` keys
2. Extract storyId from SK (format: `VOTE#storyId#userId`)
3. Query all votes for the story with pagination (Limit: 100)
4. Properly unmarshall all DynamoDB types (S, N, L, M, BOOL, NULL) using AWS SDK utility
5. Compute `voteCount` (total) and `avgVote` (numeric only, excluding ☕ and ❓)
6. Update story record with new aggregates

**Idempotency**: Safe to replay events (recomputes from current state)

**Error Handling**: 
- Dead Letter Queue (DLQ) for failed batches after 3 retries
- Structured logging for debugging

**Performance Target**: <2s p95 latency from vote cast to aggregate update

### 5. Cognito User Pool

**Purpose**: Manage user authentication and authorization

**Configuration**:
- Sign-in: Email or username
- Password policy: Min 8 chars, 1 digit required
- Self sign-up: Enabled
- MFA: Optional (future enhancement)
- Token expiry: 1 hour (refresh: 30 days)

**Integration**:
- AppSync validates JWT on every request
- Lambda resolvers access user claims via `ctx.identity`

### 6. Frontend Integration

**Purpose**: Replace PeerJS with AWS Amplify for AppSync communication

**New Hooks**:
- `useGraphQL` - Wrapper for mutations and queries
- `useSubscription` - Real-time event subscriptions
- `useAuth` - Sign-in/sign-up flows

**State Management**:
- Optimistic updates on user actions
- Server events update local state via subscriptions
- Rollback on mutation failures

**Configuration**:
```typescript
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: env.VITE_COGNITO_CLIENT_ID
    }
  },
  API: {
    GraphQL: {
      endpoint: env.VITE_GRAPHQL_ENDPOINT,
      defaultAuthMode: 'userPool'
    }
  }
})
```

## Data Models

### DynamoDB Single-Table Design

**Table Name**: `ScrumRealtimeTable`

**Primary Key**:
- `PK` (Partition Key): `ROOM#<roomId>`
- `SK` (Sort Key): Entity-specific pattern

**GSI1** (for room code lookup and user's rooms):
- `GSI1PK`: `ROOM_CODE#<code>` OR `USER#<userId>`
- `GSI1SK`: `ROOM#<roomId>`

**Entity Patterns**:

| Entity | PK | SK | GSI1PK | GSI1SK | Attributes |
|--------|----|----|--------|--------|------------|
| Room | `ROOM#abc-123` | `ROOM#abc-123` | `ROOM_CODE#FALCON` | `ROOM#abc-123` | name, code, stage, createdBy, createdAt, updatedAt |
| Room (user index) | `ROOM#abc-123` | `ROOM#abc-123` | `USER#user-789` | `ROOM#abc-123` | (same record, dual GSI keys) |
| Story | `ROOM#abc-123` | `STORY#xyz-456` | - | - | title, description, voteCount, avgVote, revealed, status, tags |
| Vote | `ROOM#abc-123` | `VOTE#xyz-456#user-789` | - | - | value, createdAt |
| Presence | `ROOM#abc-123` | `PRES#user-789` | - | - | displayName, role, state, lastSeen, ttl |
| RetroNote | `ROOM#abc-123` | `RETRO#note-111` | - | - | category, text, authorId, votes, createdAt |

**Access Patterns**:
1. Get room: `PK = ROOM#id AND SK = ROOM#id`
2. List stories: `PK = ROOM#id AND SK begins_with STORY#`
3. List votes for story: `PK = ROOM#id AND SK begins_with VOTE#storyId#` (with Limit: 100)
4. List presence: `PK = ROOM#id AND SK begins_with PRES#`
5. Lookup room by code: `GSI1PK = ROOM_CODE#code` (query GSI1)
6. List user's rooms: `GSI1PK = USER#userId` (query GSI1)

**TTL Configuration**:
- Attribute: `ttl`
- Applied to: Presence records
- Expiry: 300 seconds (5 minutes) from last heartbeat
- Heartbeat interval: 30 seconds (allows 10 missed heartbeats)
- Cleanup: Automatic via DynamoDB TTL

### Vote Value Encoding

**Allowed Values**: `["1", "2", "3", "5", "8", "13", "21", "☕", "❓"]`

**Fibonacci Cards**: "1", "2", "3", "5", "8", "13", "21"
**Special Cards**: "☕" (coffee break), "❓" (need info)

**Validation**: Lambda resolver MUST validate vote value is in allowed set before writing to DynamoDB

**Average Calculation**: Exclude special cards (☕, ❓), parse numeric strings, handle empty case (avgVote = null)

## Error Handling

### Client-Side Errors

| Scenario | Error Code | User Message | Action |
|----------|------------|--------------|--------|
| Invalid room code | `ROOM_NOT_FOUND` | "Room code not found. Double-check the code." | Prompt retry |
| Duplicate room code | `CODE_EXISTS` | "Code already in use. Try: FALCON2" | Suggest alternative |
| Unauthorized action | `FORBIDDEN` | "Only the moderator can reveal votes." | Disable button |
| Network timeout | `TIMEOUT` | "Connection lost. Reconnecting..." | Auto-retry |

### Server-Side Errors

**Transient Errors** (auto-retry):
- DynamoDB throttling → exponential backoff
- Lambda cold start → provisioned concurrency (if needed)
- Network timeouts → retry with jitter

**Terminal Errors** (user action required):
- Validation failures → return 400 with details
- Authorization failures → return 403
- Resource not found → return 404

### Logging Strategy

**Structured Logs**:
```typescript
logger.info('vote.cast', {
  roomId: 'abc-123',
  storyId: 'xyz-456',
  userId: 'user-789',
  value: '5',
  latency_ms: 234
})
```

**Log Levels**:
- ERROR: Unhandled exceptions, authorization failures
- WARN: Retries, throttling, validation errors
- INFO: Successful operations with metrics
- DEBUG: Detailed request/response (disabled in prod)

## Testing Strategy

### Unit Tests

**Lambda Resolvers**:
- Test each mutation/query handler in isolation
- Mock DynamoDB client
- Verify correct PK/SK construction
- Test error handling paths

**Tally Processor**:
- Test vote aggregate calculations
- Test handling of special cards
- Test idempotency (replay events)

**Coverage Target**: >80% for business logic

### Integration Tests

**End-to-End Flows**:
1. Create room → join → subscribe → verify presence event
2. Create story → cast vote → verify tally update
3. Reveal votes → verify all subscribers receive event
4. Presence heartbeat → verify TTL refresh

**Tools**: Jest + AWS SDK mocks or LocalStack

### Load Tests

**Scenarios**:
- 50 concurrent users joining rooms
- 100 votes cast simultaneously
- 1000 subscription connections

**Tools**: Artillery or k6

**Success Criteria**:
- 99.5%+ success rate
- p95 latency <500ms
- No DynamoDB throttling

### Synthetic Monitoring

**Nightly Probe**:
- Runs daily at 07:00 UTC
- Executes full room flow (create → join → vote → reveal)
- Measures SLI metrics
- Alerts on failure

## Deployment Strategy

### Infrastructure Deployment

**Steps**:
1. Install dependencies: `npm ci`
2. Build Lambda bundles: `npm run build`
3. Synthesize CDK: `cdk synth`
4. Deploy stack: `cdk deploy`
5. Capture outputs: GraphQL URL, Cognito IDs

**Rollback Plan**:
- CDK maintains previous stack version
- Rollback command: `cdk deploy --rollback`
- Database: No schema changes, backward compatible

### Frontend Deployment

**Steps**:
1. Update `.env.production` with CDK outputs
2. Build: `npm run build`
3. Deploy to hosting (Vercel, Netlify, or S3+CloudFront)

**Feature Flags**:
- `ENABLE_APPSYNC` - Toggle between P2P and AppSync
- Gradual rollout: 10% → 50% → 100%

### CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
trigger: push to infra/**
steps:
  - checkout
  - setup node 20
  - install dependencies
  - build lambdas
  - cdk synth
  - cdk deploy (with OIDC role)
  - output stack results
```

**Environments**:
- `dev` - Auto-deploy on PR merge
- `prod` - Manual approval required

## Security Considerations

### Authentication

- JWT tokens validated by AppSync
- Token expiry: 1 hour
- Refresh tokens: 30 days
- No anonymous access (guest mode future)

### Authorization

- Moderator role: Can change stage, reveal votes, delete stories
- Member role: Can vote, create stories, add retro notes
- Observer role: Read-only (future)

### Data Privacy

- Display names: User-controlled
- Vote values: Hidden until revealed (server-enforced)
- Retro notes: Visible to all room members
- TTL: Auto-delete stale presence

### Network Security

- All traffic over HTTPS (port 443)
- WebSocket connections: WSS protocol
- CORS: AppSync automatically handles CORS for GraphQL endpoints
- Region: Parameterized via CDK context (default: us-east-1)

## Performance Optimizations

### Lambda Cold Starts

**Mitigation**:
- Use esbuild for minimal bundle size
- Keep dependencies lean (AWS SDK v3 tree-shakeable)
- Provisioned concurrency (if needed)

### DynamoDB Performance

**Optimization**:
- On-demand billing (auto-scales)
- Single-table design (minimize round trips)
- Batch operations where possible
- GSI for efficient lookups

### AppSync Caching

**Future Enhancement**:
- Enable caching for read-heavy queries
- TTL: 60 seconds for room metadata
- Invalidate on mutations

## Monitoring and Observability

### CloudWatch Metrics

**Custom Metrics**:
- `JoinRoomSuccess` / `JoinRoomFailure`
- `MutationLatency` (p50, p95, p99)
- `SubscriptionDeliveryLatency`
- `VoteTallyLatency`

**Alarms**:
- High error rate: >10 errors in 5 minutes
- High latency: p95 >500ms
- DynamoDB throttling: >0 in 1 minute

### SLI Dashboard

**Metrics**:
1. Connectivity success rate: 99.5% target
2. Pub/sub latency p95: <250ms target
3. Vote tally latency p95: <2s target
4. Presence freshness: <30s target

**Visualization**: Domo dashboards (via ETL pipeline)

### Distributed Tracing

**AWS X-Ray**:
- Enabled on AppSync
- Trace requests through Lambda → DynamoDB
- Identify bottlenecks

## Critical Implementation Notes

### Room Code Lookup (CRITICAL FIX)

**Problem**: Original scaffold had `getRoomByCode` throwing an error.

**Solution**: 
1. In `createRoom`, write TWO GSI1 entries:
   - `GSI1PK=ROOM_CODE#{code}, GSI1SK=ROOM#{id}` (for code lookup)
   - `GSI1PK=USER#{userId}, GSI1SK=ROOM#{id}` (for user's rooms)
2. In `getRoomByCode`, query GSI1 with `GSI1PK=ROOM_CODE#{code}`
3. In `listRooms`, query GSI1 with `GSI1PK=USER#{userId}`

### Vote Value Validation (CRITICAL FIX)

**Problem**: Original scaffold accepted any vote value.

**Solution**: Add validation in `castVote`:
```typescript
const ALLOWED_VOTES = ["1", "2", "3", "5", "8", "13", "21", "☕", "❓"];
if (!ALLOWED_VOTES.includes(value)) {
  throw new Error(`Invalid vote value. Allowed: ${ALLOWED_VOTES.join(', ')}`);
}
```

### Moderator Authorization (CRITICAL FIX)

**Problem**: Original `revealVotes` didn't check moderator role.

**Solution**: Add role check:
```typescript
async function revealVotes(ctx: Ctx) {
  const { roomId, storyId } = ctx.arguments;
  const userId = userIdOf(ctx);
  
  // Fetch user's presence to check role
  const presence = await getPresence(roomId, userId);
  if (presence.role !== 'MODERATOR') {
    throw new Error('Only moderators can reveal votes');
  }
  
  // Proceed with reveal...
}
```

### DynamoDB Unmarshalling (CRITICAL FIX)

**Problem**: Custom unmarshall only handled S and N types.

**Solution**: Use AWS SDK utility:
```typescript
import { unmarshall } from '@aws-sdk/util-dynamodb';

// In tally processor
const newItem = rec.dynamodb?.NewImage ? unmarshall(rec.dynamodb.NewImage) : undefined;
```

### TTL Extended to 5 Minutes

**Rationale**: 90 seconds was too aggressive for mobile users. 300 seconds (5 minutes) with 30-second heartbeats allows 10 missed heartbeats before disconnect.

### Dead Letter Queue for Tally Processor

**Purpose**: Capture failed vote tally batches for manual investigation and replay.

**Configuration**: SQS queue with 14-day retention, attached to Lambda event source mapping.

## Migration Plan

### Phase 1: Parallel Run (Week 1)
- Deploy AppSync stack
- Keep P2P code active (feature flag)
- 10% of users on AppSync (canary)
- Monitor SLIs

### Phase 2: Primary Rollout (Week 2)
- 50% of users on AppSync
- P2P fallback if AppSync fails
- Compare connectivity metrics

### Phase 3: Full Cutover (Week 3)
- 100% of users on AppSync
- Remove P2P code
- Celebrate 99.5%+ connectivity! 🎉

### Rollback Criteria
- If AppSync SLI <95%, revert to P2P
- Debug, fix, re-deploy

## Future Enhancements

### Q1 2025
- AI-powered estimate suggestions
- Jira/Linear integration
- Multi-room facilitator mode

### Q2 2025
- Advanced retro templates
- Voice notes for async retro
- Custom voting scales

### Q3 2025
- Analytics dashboards
- Public API
- White-label version

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Status**: Ready for Implementation
