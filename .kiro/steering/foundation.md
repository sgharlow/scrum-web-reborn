# Scrum Reborn - Steering Foundation

## Project Identity

**Name**: Scrum Reborn
**Tagline**: "Reliable, real-time collaboration for distributed Scrum teams"
**Mission**: Transform scrum planning and retrospectives with guaranteed 99%+ connectivity, eliminating the frustration of dropped connections and synchronization issues.

---

## Tone & Voice

**Supportive**: We're here to make your Scrum ceremonies smoother, not to get in the way.
**Efficient**: Every interaction should feel fast and purposeful.
**Clear**: No jargon, no confusion. If you're voting, you know you're voting. If you're joined, you know you're joined.
**Confident**: "Connected" means connected. "Revealed" means revealed. No ambiguity.

### Language Guidelines

- ✅ **Do say**: "Connected", "Vote cast", "Estimate confirmed"
- ❌ **Don't say**: "Syncing...", "Maybe connected", "Trying to update"
- ✅ **Do say**: "Waiting for 3 more votes"
- ❌ **Don't say**: "3 users haven't voted yet (probably)"

---

## Naming Conventions

### User-Facing Terms

| Concept | Term | NOT |
|---------|------|-----|
| Planning poker session | **Room** | "Session", "Space", "Channel" |
| User story to estimate | **Story** | "Task", "Ticket", "Item" |
| Retrospective sticky note | **Retro Note** | "Card", "Comment", "Entry" |
| Estimate submission | **Vote** | "Estimate", "Submission", "Choice" |
| Participant status | **Presence** | "Status", "Activity", "Online state" |
| Session facilitator | **Moderator** | "Admin", "Host", "Leader" |
| Join code | **Room Code** | "Invite code", "Access key", "PIN" |

### Event Naming (Internal/Technical)

Follow the pattern: `<entity>.<action>` (past tense)

- `story.created` ✅ (NOT `storyCreated` or `STORY_CREATED`)
- `vote.cast` ✅ (NOT `voteCasted` or `voteSubmitted`)
- `retro.added` ✅
- `presence.heartbeat` ✅
- `votes.revealed` ✅
- `stage.changed` ✅

### GraphQL Schema Conventions

- **Types**: PascalCase (`Room`, `Story`, `RetroNote`)
- **Fields**: camelCase (`roomId`, `displayName`, `voteCount`)
- **Enums**: SCREAMING_SNAKE_CASE (`PLANNING`, `VOTING`, `RETRO`, `ONLINE`)
- **Mutations**: verb + noun (`createRoom`, `castVote`, `revealVotes`)
- **Queries**: get/list + noun (`getRoom`, `listStories`)
- **Subscriptions**: on + entity + event (`onRoomEvent`, `onVoteChanged`)

### DynamoDB Access Patterns

- **Primary Key**: `PK` (partition key), `SK` (sort key)
- **GSI**: `GSI1PK`, `GSI1SK` (never `GSI-1-PK`)
- **Entities**: Prefix with entity type
  - `ROOM#{id}` for rooms
  - `STORY#{id}` for stories
  - `VOTE#{storyId}#{userId}` for votes
  - `PRES#{userId}` for presence
  - `RETRO#{id}` for retro notes

---

## UX Principles

### 1. **Connection Clarity**
Never leave users guessing about their connection state.

```typescript
// ✅ Good: Clear states
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

// ❌ Bad: Ambiguous
type ConnectionStatus = 'online' | 'maybe' | 'unknown'
```

**Visual treatment**:
- 🟢 Green: Connected, all systems go
- 🟡 Yellow: Connecting, transient, should resolve quickly
- 🔴 Red: Disconnected, actionable error

### 2. **Optimistic UI with Rollback**
Submit actions immediately, show feedback, rollback on failure.

```typescript
// ✅ Good: Optimistic
dispatch({ type: 'CAST_VOTE', value: '5' }) // Immediate UI update
await castVoteMutation({ value: '5' })      // API call
  .catch(() => dispatch({ type: 'REVERT_VOTE' })) // Rollback on error

// ❌ Bad: Loading state purgatory
setLoading(true)
await castVoteMutation({ value: '5' })
setLoading(false)
```

### 3. **Presence is Always Fresh**
Users should trust that who they see is who's actually there.

- Heartbeat every 30s
- TTL auto-cleanup after 90s
- Visual indicator if user hasn't been seen in >30s

### 4. **Votes Hidden Until Revealed**
Planning poker integrity demands vote secrecy.

- Show "✓ Voted" checkmark, NEVER the value
- Reveal all votes simultaneously on moderator action
- No peeking via DevTools (filter server-side)

---

## Error Handling Philosophy

### User-Facing Errors

**Principle**: Only show errors the user can act on.

| Scenario | ❌ Bad Message | ✅ Good Message |
|----------|---------------|----------------|
| Invalid room code | "GraphQL error: Room not found" | "Room code not found. Double-check the code." |
| Connection timeout | "WebSocket closed unexpectedly" | "Connection lost. Reconnecting..." |
| Permission denied | "Lambda threw UnauthorizedException" | "Only the moderator can reveal votes." |

### Transient vs. Terminal Errors

**Transient** (auto-retry):
- Network timeouts
- Lambda cold starts
- DynamoDB throttling

**Terminal** (user action required):
- Invalid room code
- Permission errors
- Validation failures (e.g., empty story title)

### Logging Strategy

```typescript
// ✅ Good: Structured logs with context
logger.info('vote.cast', {
  roomId: 'abc-123',
  storyId: 'xyz-456',
  userId: 'user-789',
  value: '5',
  latency_ms: 234
})

// ❌ Bad: Useless logs
console.log('Vote cast successfully!')
```

---

## Reliability Commitments

### SLI Targets (Public Promises)

These are what we tell users and measure ourselves against:

| SLI | Target | User Impact |
|-----|--------|-------------|
| **Join Success Rate** | ≥99.5% | "You can always join a room" |
| **Pub/Sub Latency (p95)** | ≤250ms | "Updates feel instant" |
| **Presence Freshness** | ≤30s | "You know who's really here" |
| **Vote Tally Latency (p95)** | ≤2s | "Aggregates update quickly" |

### Degraded Mode (If SLIs Breach)

If connectivity drops below 95%:
1. Display yellow banner: "Experiencing connection issues. Retrying..."
2. Auto-retry with exponential backoff
3. Alert engineering team via Slack
4. Log incident to Domo for post-mortem

If AppSync is down (rare):
1. Display red banner: "Service unavailable. Please try again shortly."
2. Disable new room creation
3. Allow existing rooms to continue (best effort)
4. Page on-call engineer

---

## Feature Flags

### Progressive Rollout Strategy

New features ship behind flags, enabled for % of users:

```typescript
const FEATURE_FLAGS = {
  RETRO_VOTING: true,          // GA
  TIMER_WIDGET: false,         // Not yet
  AI_ESTIMATE_SUGGEST: 'beta'  // Beta users only
}
```

### A/B Testing Hooks

```yaml
# Example: Test two vote reveal animations
experiment: vote_reveal_animation
variants:
  - name: slide_in
    weight: 50
  - name: fade_in
    weight: 50
metrics:
  - user_engagement_score
  - time_to_next_action
```

---

## Accessibility

### WCAG 2.1 AA Compliance

- **Color contrast**: 4.5:1 minimum for text
- **Keyboard navigation**: Full functionality without mouse
- **Screen readers**: ARIA labels on all interactive elements
- **Focus indicators**: Visible focus rings

### Responsive Design

- **Mobile-first**: Planning poker on phones during standup
- **Tablet-optimized**: Retro boards on iPads
- **Desktop-enhanced**: Side-by-side story list + voting

---

## Security & Privacy

### Authentication

- Cognito User Pools for user management
- JWT tokens in `Authorization: Bearer` header
- Token expiry: 1 hour (refresh token: 30 days)

### Authorization

- Moderator role: Can change stage, reveal votes, delete stories
- Member role: Can vote, add retro notes, create stories
- Observer role: Read-only (future)

### Data Privacy

- Display names: User-controlled, not email addresses
- Retro notes: Visible to all room members (not anonymous)
- Vote values: Hidden until revealed (server-enforced)
- TTL: Presence records auto-delete after 90s

---

## Code Style Preferences

### TypeScript Strict Mode

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true
}
```

### Prefer Functional Patterns

```typescript
// ✅ Good: Immutable updates
const newStory = { ...story, estimate: '5' }

// ❌ Bad: Mutation
story.estimate = '5'
```

### Lambda Handlers: Minimal Dependencies

- Use AWS SDK v3 (tree-shakeable)
- Bundle with esbuild (single-file output)
- Avoid heavy frameworks (no Express, no Koa)

---

## Monitoring & Observability

### Dashboards (Domo)

1. **SLI Dashboard**: Real-time SLI metrics vs. targets
2. **User Engagement**: Daily active rooms, votes cast, stories estimated
3. **Error Budget**: % of error budget consumed this month

### Alerts (Slack)

- 🚨 **Critical**: SLI breach, API downtime, Lambda errors >10/min
- ⚠️ **Warning**: Latency p95 >500ms, DynamoDB throttling
- ℹ️ **Info**: Nightly probe success, deploy notifications

### Synthetic Monitoring

- **Nightly probe**: Full E2E flow (create room → vote → reveal)
- **Success criteria**: <15s total, all steps pass
- **On failure**: Slack alert + log to Domo

---

## Hackathon Submission (Kiroween)

### Key Differentiators

1. **Connectivity Transformation**: 50% → 99.5% is a 99x improvement in reliability
2. **Kiro-First Development**: Specs → Code (not code → specs)
3. **SLI-Driven**: Every feature has measurable user impact
4. **Production-Ready**: Not a demo, a deployable system

### Demo Flow (5 minutes)

1. **Show the problem** (30s): Old app disconnects, frustration
2. **Explain the solution** (60s): AppSync replaces P2P, guaranteed delivery
3. **Live demo** (120s): Create room, multi-device join, vote, reveal, retro
4. **Show Kiro artifacts** (60s): Domain specs, hooks, SLI dashboard
5. **Highlight metrics** (60s): 99.5% uptime, <250ms latency, nightly probes

### Judging Criteria Alignment

| Criterion | How We Excel |
|-----------|--------------|
| **Innovation** | P2P → AppSync for Scrum is novel, solves real pain |
| **Technical Execution** | CDK infra, DynamoDB Streams, GraphQL subscriptions |
| **Kiro Integration** | Specs drive code, hooks automate tests, MCP for metrics |
| **Impact** | Teams can finally trust their planning tools |

---

## Future Roadmap (Post-Hackathon)

### Q1 2025
- AI-powered estimate suggestions (based on historical data)
- Jira/Linear integration (sync stories)
- Multi-room facilitator mode

### Q2 2025
- Advanced retro templates (Start/Stop/Continue, Mad/Sad/Glad)
- Voice notes for async retro participation
- Custom voting scales (T-shirt sizes, hours, etc.)

### Q3 2025
- Analytics dashboards (velocity trends, estimation accuracy)
- Public API for integrations
- White-label version for enterprise

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Owner**: Scrum Reborn Team
**Status**: Living Document (update as we learn)
