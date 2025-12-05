# Kiroween Hackathon - Scrum Reborn Execution Plan

## Executive Summary

**Objective**: Transform scrum-web-app from 50% P2P connectivity to 99.5% serverless reliability by migrating to AWS AppSync + DynamoDB, demonstrating Kiro-first development methodology.

**Timeline**: 2-3 days focused implementation
**Team**: 1-2 developers
**Cost**: ~$10-20/month AWS (free tier eligible initially)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Kiro Hackathon Strategy](#kiro-hackathon-strategy)
5. [Testing & Validation](#testing--validation)
6. [Deployment Checklist](#deployment-checklist)
7. [Demo Script](#demo-script)

---

## Current State Analysis

### Existing Architecture

```
┌─────────────┐         P2P WebRTC          ┌─────────────┐
│   Client A  │◄──────────────────────────►│   Client B  │
│  (Browser)  │    via PeerJS Signaling    │  (Browser)  │
└─────────────┘                             └─────────────┘
       │                                            │
       └────────────────┬───────────────────────────┘
                        │
                 ┌──────▼──────┐
                 │ Free TURN   │ ← 50% success rate
                 │   Servers   │   (NAT traversal failures)
                 └─────────────┘
```

**Connectivity Issues:**
- **NAT/Firewall**: 40-50% of users behind restrictive networks can't establish P2P
- **Unreliable TURN**: Free public servers (metered.ca, numb.viagenie.ca) have:
  - Rate limiting
  - Geographic latency
  - Unpredictable availability
  - No SLA
- **State Sync**: Manual conflict resolution, no guaranteed message delivery
- **Scalability**: Every new participant = N² connection complexity

**Tech Stack (Current):**
- Frontend: React 19 + TypeScript + Vite
- State: useReducer pattern
- Networking: PeerJS (WebRTC)
- Deployment: Static hosting (no backend)

---

## Target Architecture

### AppSync + DynamoDB Serverless Stack

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

**Connectivity Solution:**
- **No NAT/Firewall Issues**: All communication via HTTPS (AppSync WSS)
- **Guaranteed Delivery**: AppSync manages WebSocket reconnection/buffering
- **Ordered Events**: DynamoDB Streams ensure sequential processing
- **Infinite Scale**: Serverless auto-scaling

**Tech Stack (Target):**
- Frontend: React 19 + AWS Amplify GraphQL client
- Backend: AWS AppSync (GraphQL API)
- Database: DynamoDB (single-table design)
- Auth: Cognito User Pools
- Infrastructure: AWS CDK (TypeScript)
- CI/CD: GitHub Actions

---

## Implementation Phases

### Phase 1: Foundation Setup (Day 1 Morning - 3 hours)

**Kiro-First Approach**: Start with specs, generate code.

#### 1.1 Create Kiro Specs ✅ DONE
- [x] `.kiro/specs/domain.yaml` - Entities, SLIs, constraints
- [x] `.kiro/specs/flows.yaml` - User flows, event choreography
- [x] `.kiro/specs/connectors.yaml` - Domo, CloudWatch, Slack integrations
- [x] `.kiro/hooks/` - Automation hooks (spec changes, nightly probes, deploys)
- [x] `.kiro/steering/foundation.md` - Tone, naming, UX principles
- [x] `.kiro/mcp/servers.json` - MCP server configs

#### 1.2 Bootstrap AWS CDK Infrastructure (1 hour)
```bash
cd scrum-web-reborn
mkdir infra
cd infra
npm init -y
npm install aws-cdk-lib constructs esbuild typescript
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb uuid
```

Copy scaffold from `reborn-spec.md`:
- `infra/bin/infra.ts` - CDK app entry point
- `infra/lib/scrum-realtime-stack.ts` - Stack definition
- `infra/cdk.json` - CDK config
- `infra/tsconfig.json` - TypeScript config
- `infra/esbuild.mjs` - Lambda bundler

#### 1.3 Define GraphQL Schema (30 minutes)
```bash
mkdir -p infra/graphql
```

Copy `infra/graphql/schema.graphql` from spec (or generate from domain.yaml with Kiro IDE).

**Key elements:**
- Mutations: `createRoom`, `joinRoom`, `castVote`, `revealVotes`, `addRetroNote`
- Queries: `getRoom`, `listStories`, `listRetro`
- Subscriptions: `onRoomEvent`, `onStoryChanged`, `onVoteChanged`, `onPresenceChanged`

#### 1.4 Deploy Minimal Stack (1 hour)
```bash
npm run build
npx cdk bootstrap  # One-time setup
npx cdk deploy
```

**Outputs to capture:**
- `GraphqlUrl`
- `UserPoolId`
- `UserPoolClientId`

**Success Criteria:**
- [ ] Stack deploys without errors
- [ ] AppSync API is reachable
- [ ] Can create test user in Cognito

---

### Phase 2: Lambda Resolvers (Day 1 Afternoon - 4 hours)

#### 2.1 Implement Mutations Lambda (2 hours)
Create `infra/lambda/mutations/index.ts`:

**Priority mutations (implement first):**
1. `createRoom` - Generate unique code, initialize room
2. `joinRoom` - Lookup by code, create presence with TTL
3. `createStory` - Add story to room
4. `castVote` - Upsert vote record
5. `revealVotes` - Set story.revealed = true

**Data model (DynamoDB single-table):**
- `ROOM#{id}` / `ROOM#{id}` → Room entity
- `ROOM#{id}` / `STORY#{storyId}` → Story entity
- `ROOM#{id}` / `VOTE#{storyId}#{userId}` → Vote entity
- `ROOM#{id}` / `PRES#{userId}` → Presence (with TTL)
- `ROOM#{id}` / `RETRO#{retroId}` → Retro note

#### 2.2 Implement Queries Lambda (1 hour)
**Priority queries:**
1. `getRoom(id)` - Fetch room metadata
2. `getRoomByCode(code)` - Join flow (needs GSI or mapping item)
3. `listStories(roomId)` - Paginated story list
4. `listRetro(roomId)` - Paginated retro notes

#### 2.3 Deploy & Test (1 hour)
```bash
npm run build
npm run cdk:deploy
```

**Manual testing:**
- Use AppSync console to run test mutations
- Verify data in DynamoDB table
- Check CloudWatch logs for errors

---

### Phase 3: Tally Processor (Day 1 Evening - 2 hours)

#### 3.1 Implement DynamoDB Streams Lambda (1 hour)
Create `infra/lambda/tally/index.ts`:

**Logic:**
1. Listen for `INSERT`/`REMOVE` on `VOTE#*` records
2. Query all votes for the story
3. Compute `voteCount` and `avgVote`
4. Update story record with `UpdateCommand`

**Key considerations:**
- Handle numeric votes ("1", "2", "3", "5", "8", "13")
- Skip special cards ("☕", "❓") in average calculation
- Idempotent processing (retry-safe)

#### 3.2 Wire Up Stream Trigger (30 minutes)
In `scrum-realtime-stack.ts`:
```typescript
tallyFn.addEventSourceMapping('DdbStream', {
  eventSourceArn: table.tableStreamArn!,
  startingPosition: lambda.StartingPosition.LATEST,
  batchSize: 50,
  bisectBatchOnError: true,
  retryAttempts: 3
})
```

#### 3.3 Test Vote Tally Flow (30 minutes)
1. Cast vote via mutation
2. Poll story for updated `voteCount`/`avgVote`
3. Measure latency (target: <2s p95)

---

### Phase 4: Frontend Integration (Day 2 Morning - 4 hours)

#### 4.1 Install AWS Amplify (15 minutes)
```bash
npm install @aws-amplify/api-graphql @aws-amplify/auth aws-amplify
```

#### 4.2 Configure Amplify (30 minutes)
Create `src/aws-config.ts`:
```typescript
import { Amplify } from 'aws-amplify'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      region: 'us-east-1'
    }
  },
  API: {
    GraphQL: {
      endpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT,
      region: 'us-east-1',
      defaultAuthMode: 'userPool'
    }
  }
})
```

#### 4.3 Replace PeerJS with GraphQL (2 hours)
**Remove:**
- `hooks/useCollaboration.ts`
- PeerJS script tag from `index.html`

**Add:**
- `hooks/useGraphQL.ts` - Wrapper for mutations/queries
- `hooks/useSubscription.ts` - Real-time event subscriptions

**Example:**
```typescript
// hooks/useGraphQL.ts
import { generateClient } from '@aws-amplify/api-graphql'
import type { Schema } from '../graphql/schema'

const client = generateClient<Schema>()

export const useGraphQL = () => {
  const castVote = async (roomId: string, storyId: string, value: string) => {
    const result = await client.graphql({
      query: mutations.castVote,
      variables: { roomId, storyId, value }
    })
    return result.data.castVote
  }

  // ... other mutations

  return { castVote, /* ... */ }
}
```

```typescript
// hooks/useSubscription.ts
import { useEffect, useState } from 'react'
import { client } from './useGraphQL'
import { subscriptions } from '../graphql/subscriptions'

export const useRoomSubscription = (roomId: string) => {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const sub = client.graphql({
      query: subscriptions.onRoomEvent,
      variables: { roomId }
    }).subscribe({
      next: ({ data }) => {
        setEvents(prev => [...prev, data.onRoomEvent])
      },
      error: (err) => console.error('Subscription error:', err)
    })

    return () => sub.unsubscribe()
  }, [roomId])

  return events
}
```

#### 4.4 Update App.tsx State Management (1 hour)
- Replace PeerJS state with GraphQL client
- Update `dispatch` calls to trigger mutations
- Wire subscriptions to update local state

**Pattern:**
```typescript
// Old (PeerJS)
const handleVote = (value) => {
  dispatch({ type: 'CAST_VOTE', payload: { participantId, value } })
  broadcast({ type: 'CAST_VOTE', payload: { participantId, value } })
}

// New (AppSync)
const handleVote = async (value) => {
  dispatch({ type: 'CAST_VOTE', payload: { participantId, value } })  // Optimistic
  try {
    await castVote(roomId, storyId, value)
  } catch (err) {
    dispatch({ type: 'REVERT_VOTE' })  // Rollback
    console.error('Vote failed:', err)
  }
}
```

#### 4.5 Test Multi-Device Sync (30 minutes)
1. Open app in two browser windows
2. Create room in window A
3. Join from window B with code
4. Cast votes, add stories, see real-time updates
5. Verify <250ms latency (use browser DevTools Network tab)

---

### Phase 5: Auth & Security (Day 2 Afternoon - 2 hours)

#### 5.1 Implement Sign-Up/Sign-In Flow (1 hour)
Create `components/AuthFlow.tsx`:
```typescript
import { signIn, signUp, confirmSignUp } from '@aws-amplify/auth'

const AuthFlow = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  const handleSignUp = async (email, password) => {
    await signUp({ username: email, password })
    // Show confirmation code input
  }

  const handleSignIn = async (email, password) => {
    await signIn({ username: email, password })
    // Redirect to app
  }

  // ... render form
}
```

#### 5.2 Add Role-Based Access Control (30 minutes)
In Lambda resolvers, check `ctx.identity.claims`:
```typescript
const setRoomStage = async (ctx) => {
  const { roomId, stage } = ctx.arguments
  const userId = ctx.identity.sub

  // Fetch room to check if user is moderator
  const room = await getRoom(roomId)
  if (room.createdBy !== userId) {
    throw new Error('Only moderator can change room stage')
  }

  // ... proceed with update
}
```

#### 5.3 Implement Guest Mode (Optional, 30 minutes)
Allow anonymous users to join rooms without sign-up:
- Use Cognito Identity Pools for guest credentials
- Limit guest capabilities (read-only or vote-only)

---

### Phase 6: Observability & SLI Monitoring (Day 2 Evening - 3 hours)

#### 6.1 Add CloudWatch Metrics (1 hour)
In Lambda resolvers, emit custom metrics:
```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'

const cloudwatch = new CloudWatchClient({})

const emitMetric = async (name: string, value: number) => {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'ScrumReborn',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: 'None',
      Timestamp: new Date()
    }]
  }))
}

// Usage
await emitMetric('JoinRoomSuccess', 1)
await emitMetric('MutationLatency', latencyMs)
```

#### 6.2 Set Up Domo Integration (1 hour)
Create `infra/lambda/domo-etl/index.ts`:
```typescript
// Poll CloudWatch for SLI metrics
// Transform to Domo dataset format
// Push via Domo API
```

Wire up EventBridge rule:
```typescript
const etlRule = new events.Rule(this, 'DomoEtlRule', {
  schedule: events.Schedule.rate(Duration.minutes(15))
})
etlRule.addTarget(new targets.LambdaFunction(domoEtlFn))
```

#### 6.3 Implement Nightly Probe (from Kiro hook) (1 hour)
Deploy `.kiro/hooks/nightly_sli_probe.yaml` as Lambda function:
```bash
kiro deploy hook nightly_sli_probe --target aws-lambda
```

Or manually create Lambda that:
1. Authenticates as probe user
2. Creates room → joins → votes → reveals
3. Measures latencies
4. Writes results to CloudWatch + Domo
5. Alerts Slack on failure

---

### Phase 7: Polish & Hackathon Prep (Day 3 - 4 hours)

#### 7.1 UI/UX Refinements (1 hour)
- Connection status indicator (green/yellow/red)
- Loading states for mutations
- Error toasts for failures
- Smooth animations for vote reveals

#### 7.2 Create Demo Dataset (30 minutes)
Pre-populate Cognito with test users:
```bash
aws cognito-idp admin-create-user \
  --user-pool-id <pool-id> \
  --username alice@demo.local \
  --temporary-password DemoPass123!
```

Create sample room with stories:
```graphql
mutation {
  createRoom(name: "Hackathon Demo", code: "KIRO24") { id }
  createStory(roomId: "...", title: "User can join rooms with 99.5% success") { id }
  createStory(roomId: "...", title: "Votes sync in <250ms") { id }
}
```

#### 7.3 Record Demo Video (1 hour)
**Script:**
1. Show problem: Old app disconnects mid-vote (frustration)
2. Show solution: Scrum Reborn architecture diagram
3. Live demo: Multi-device join, vote, reveal, retro
4. Show Kiro artifacts: Specs, hooks, SLI dashboard
5. Highlight metrics: 99.5% uptime, <250ms latency

#### 7.4 Prepare Hackathon Submission (1.5 hours)
**Devpost Submission:**
- **Title**: "Scrum Reborn: 99.5% Reliable Real-Time Collaboration"
- **Tagline**: "From 50% P2P failures to guaranteed connectivity with AppSync + Kiro"
- **Description**: Problem, solution, technical details, Kiro integration
- **Demo Video**: Upload to YouTube, embed link
- **GitHub Repo**: Public repo with README, Kiro specs, CDK code
- **Live Demo**: Deploy to AWS, share public URL (with demo credentials)

**README.md sections:**
1. Problem Statement
2. Solution Architecture
3. Kiro-First Development
4. SLI Metrics & Monitoring
5. Quick Start (deploy instructions)
6. Hackathon Reflection

---

## Kiro Hackathon Strategy

### Judging Criteria Alignment

| Criterion | Our Approach | Evidence |
|-----------|--------------|----------|
| **Innovation** | P2P → AppSync for Scrum is novel | Architecture diagrams, comparative analysis |
| **Technical Execution** | Production-ready CDK, DynamoDB Streams, GraphQL | Working deployment, code quality |
| **Kiro Integration** | Specs drive development, hooks automate | `.kiro/` directory, generated code |
| **Impact** | 50% → 99.5% connectivity = 99x improvement | SLI dashboards, nightly probe results |
| **Presentation** | Clear demo, compelling story | Video, live demo, GitHub README |

### Differentiators

1. **Real Problem, Real Solution**: Not a toy demo, solves actual pain
2. **Kiro-First**: Specs written before code, hooks automate testing
3. **Measurable Impact**: SLIs with concrete targets (99.5%, <250ms)
4. **Production-Ready**: Deployable to AWS, not just localhost
5. **Open Source**: Public repo, reusable patterns

### Kiro-Specific Showcases

**During Demo:**
1. **Show `.kiro/specs/domain.yaml`**: "Our domain model is the source of truth"
2. **Show `.kiro/hooks/nightly_sli_probe.yaml`**: "Automated E2E tests verify SLIs daily"
3. **Show Domo Dashboard**: "Real-time SLI monitoring from connectors.yaml"
4. **Show `.kiro/steering/foundation.md`**: "Clear tone, naming, UX principles guide development"

**Talking Points:**
- "We didn't write code first—we wrote specs, and Kiro helped generate scaffolding"
- "Our SLIs aren't aspirational—they're measured, monitored, and alarmed"
- "Nightly probes catch regressions before users do"
- "Kiro MCP connectors make Domo integration trivial"

---

## Testing & Validation

### Unit Tests
```bash
# Lambda resolver tests
cd infra
npm test

# Test createRoom handler
# Test castVote handler
# Test tally processor logic
```

### Integration Tests
```bash
# E2E flow tests
npm run test:integration

# Test: Create room → join → vote → reveal
# Test: Concurrent votes update tally correctly
# Test: Presence TTL cleanup works
```

### Load Testing
```bash
# Simulate 50 concurrent users
artillery run load-test.yml

# Target:
# - 99.5% success rate
# - p95 latency <500ms
# - No DynamoDB throttling
```

### Browser Testing
- Chrome (desktop)
- Firefox (desktop)
- Safari (iOS)
- Chrome (Android)

**Network conditions:**
- WiFi (same network)
- 4G mobile data
- Restrictive corporate proxy
- VPN

---

## Deployment Checklist

### Pre-Deploy
- [x] Kiro specs validated (`kiro validate specs`)
- [ ] All tests passing (`npm test`)
- [ ] CDK synth succeeds (`npm run cdk:synth`)
- [ ] Environment variables set (`.env.production`)

### Deploy Infrastructure
```bash
cd infra
npm run cdk:deploy
```

**Capture outputs:**
```bash
aws cloudformation describe-stacks \
  --stack-name ScrumRealtimeStack \
  --query 'Stacks[0].Outputs' > outputs.json
```

### Post-Deploy
- [ ] Create test users in Cognito
- [ ] Run smoke tests
- [ ] Verify AppSync subscriptions work
- [ ] Check CloudWatch logs (no errors)
- [ ] Test nightly probe manually

### Frontend Deploy
```bash
npm run build
# Upload dist/ to S3 + CloudFront, or Vercel, or Netlify
```

---

## Demo Script (5 Minutes)

### Slide 1: The Problem (30s)
"Teams struggle with unreliable Scrum tools. Our original app had 50% connectivity—half the team would drop mid-vote due to NAT/firewall issues with P2P WebRTC."

**Show:** Old app disconnecting, frustrated users.

### Slide 2: The Solution (1 min)
"Scrum Reborn replaces P2P with AWS AppSync, guaranteeing 99.5% connectivity. No NAT issues, no TURN failures—just reliable WebSocket subscriptions over HTTPS."

**Show:** Architecture diagram (before/after).

### Slide 3: Live Demo (2 min)
1. Create room on laptop
2. Join from phone with code (show <2s join time)
3. Add story, start vote
4. Cast votes from both devices
5. Reveal votes (show <250ms sync)
6. Add retro note, upvote

**Show:** Multi-device sync, real-time updates, smooth UX.

### Slide 4: Kiro Integration (1 min)
"We took a Kiro-first approach: specs before code. Our domain.yaml defines entities and SLIs. Hooks automate testing—nightly probes verify 99.5% uptime. Connectors push metrics to Domo for dashboards."

**Show:** `.kiro/specs/`, hooks, Domo dashboard.

### Slide 5: Impact & Future (30s)
"From 50% to 99.5% is a 99x improvement in reliability. Teams can finally trust their planning tools. Next: AI estimate suggestions, Jira integration, analytics."

**Show:** SLI dashboard, roadmap slide.

**Call to Action:** "Try it yourself at [demo-url]. Code on GitHub. Built with Kiro."

---

## Success Metrics (Hackathon)

### Technical
- [ ] 99.5% connectivity in load tests
- [ ] <250ms p95 pub/sub latency
- [ ] <2s p95 vote tally latency
- [ ] Zero critical bugs in demo

### Presentation
- [ ] 5-minute demo video uploaded
- [ ] GitHub repo with 10+ stars
- [ ] Live demo accessible to judges
- [ ] Devpost submission complete

### Kiro Integration
- [ ] 5+ Kiro specs defined
- [ ] 3+ hooks implemented
- [ ] MCP connectors configured
- [ ] Steering foundation documented

---

## Troubleshooting Guide

### Issue: CDK Deploy Fails
**Symptom:** `Error: Cannot assume role`
**Solution:** Run `aws configure` and set credentials

### Issue: AppSync 401 Unauthorized
**Symptom:** Mutations fail with "Unauthorized"
**Solution:** Check Cognito token is valid, re-login

### Issue: Subscriptions Not Working
**Symptom:** Events don't appear in UI
**Solution:** Check WebSocket connection in DevTools, verify subscription filter

### Issue: DynamoDB Throttling
**Symptom:** `ProvisionedThroughputExceededException`
**Solution:** Switch to on-demand billing or increase WCU/RCU

### Issue: High Latency (>500ms)
**Symptom:** Mutations take >1s
**Solution:** Check Lambda cold starts, add provisioned concurrency

---

## Next Steps After Hackathon

### Week 1: User Feedback
- Deploy to beta testers
- Collect UX feedback
- Fix critical bugs

### Week 2: Optimization
- Add caching (AppSync caching)
- Optimize Lambda bundle sizes
- Implement pagination

### Week 3: Advanced Features
- AI estimate suggestions
- Jira/Linear integration
- Custom voting scales

### Month 2: Go-To-Market
- Public launch
- Product Hunt submission
- Content marketing

---

**Document Version**: 1.0
**Created**: 2025-11-13
**Author**: Kiro AI Assistant
**Status**: Ready for Execution

🚀 **Let's build a winning hackathon project!**
