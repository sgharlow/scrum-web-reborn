# Kiro Artifacts for Scrum Reborn

This directory contains all Kiro-first development artifacts for the Scrum Reborn hackathon project.

## Directory Structure

```
.kiro/
├── specs/                    # Domain models, flows, and integrations
│   ├── domain.yaml          # Entities, SLIs, constraints, business rules
│   ├── flows.yaml           # User flows, event choreography, timing budgets
│   └── connectors.yaml      # External integrations (Domo, Slack, CloudWatch)
├── hooks/                    # Automation triggers
│   ├── on_spec_change_generate_tests.yaml      # Auto-generate tests on spec changes
│   ├── nightly_sli_probe.yaml                  # Synthetic E2E monitoring
│   └── on_deploy_success.yaml                  # Post-deployment validation
├── steering/                 # Project guidelines
│   └── foundation.md        # Tone, naming, UX principles, roadmap
└── mcp/                      # Model Context Protocol configs
    └── servers.json         # API integrations (Domo, Slack, AppSync, etc.)
```

## Purpose

This Kiro setup demonstrates **spec-driven development** for the Kiroween hackathon:

1. **Specs as Source of Truth**: Domain models defined before code
2. **Automated Quality**: Hooks trigger tests and validations automatically
3. **Observable by Design**: SLIs measured, monitored, and alarmed
4. **Integration-Ready**: MCP connectors make external APIs trivial

## Key Files

### domain.yaml
Defines the core data model:
- **Entities**: Room, Member, Story, Vote, RetroNote
- **SLIs**: Connectivity (99.5%), pub/sub latency (<250ms), vote tally (<2s)
- **Constraints**: Room code uniqueness, vote idempotency, presence TTL
- **Business Rules**: Vote reveal, moderator privileges, retro voting

### flows.yaml
Documents user journeys:
- **Room Lifecycle**: create_room, join_room, heartbeat_presence, leave_room
- **Planning Workflow**: planning_create_story, voting_cast_vote, voting_reveal
- **Retro Workflow**: retro_add_note, retro_vote_note
- **Event Choreography**: How mutations trigger subscriptions and async processors

### connectors.yaml
External system integrations:
- **Domo**: Push SLI metrics for dashboards (room_kpis, sli_timeseries, user_engagement)
- **CloudWatch**: Infrastructure and application metrics + alarms
- **Synthetic Probe**: Nightly E2E health checks
- **Slack**: Alerts for SLI breaches and deployment events

### Hooks
**on_spec_change_generate_tests.yaml**:
- Triggers when domain.yaml or flows.yaml changes
- Validates specs, generates GraphQL schema, runs tests, builds infrastructure

**nightly_sli_probe.yaml**:
- Runs daily at 07:00 UTC
- Executes full E2E flow (create room → vote → reveal)
- Measures SLI metrics (connectivity, latency)
- Alerts on failures, publishes to Domo

**on_deploy_success.yaml**:
- Runs after successful CDK deployment
- Fetches stack outputs (GraphQL URL, Cognito IDs)
- Runs smoke tests
- Updates frontend config

### steering/foundation.md
Project steering document covering:
- **Tone & Voice**: Supportive, efficient, clear, confident
- **Naming Conventions**: User-facing terms, event naming, GraphQL schema
- **UX Principles**: Connection clarity, optimistic UI, presence freshness, vote secrecy
- **Reliability Commitments**: SLI targets, degraded mode handling
- **Security & Privacy**: Auth, authorization, data privacy

### mcp/servers.json
MCP server configurations for:
- **Domo**: BI platform for SLI dashboards
- **Slack**: Notifications and alerts
- **AWS CloudWatch**: Metrics and monitoring
- **AppSync**: Main GraphQL API
- **DynamoDB Streams**: Event processing
- **GitHub**: Deployment tracking (future)

## Usage with Kiro IDE

1. **Validate specs**:
   ```bash
   kiro validate specs
   ```

2. **Generate GraphQL schema from domain**:
   ```bash
   kiro generate graphql --from .kiro/specs/domain.yaml --out infra/graphql/schema.graphql
   ```

3. **Deploy hooks to AWS**:
   ```bash
   kiro deploy hook nightly_sli_probe --target aws-lambda
   ```

4. **Run synthetic probe manually**:
   ```bash
   kiro run hook nightly_sli_probe
   ```

5. **Query SLI metrics**:
   ```bash
   kiro query sli connectivity_success_rate --range 7d
   ```

## Hackathon Showcase

**Demonstrate Kiro Integration:**
1. Show `.kiro/specs/domain.yaml` → "Our domain model is the source of truth"
2. Show `.kiro/hooks/nightly_sli_probe.yaml` → "Automated E2E tests verify 99.5% uptime daily"
3. Show Domo dashboard → "Real-time SLI monitoring from connectors.yaml"
4. Show `.kiro/steering/foundation.md` → "Clear principles guide every decision"

**Key Differentiators:**
- **Spec-First Development**: Models before code
- **Automated Quality**: Hooks prevent regressions
- **Measurable Impact**: SLIs tracked and alarmed
- **Production-Ready**: Not a demo, a deployable system

## Next Steps

1. Use Kiro IDE to refine specs
2. Generate infrastructure scaffolding
3. Implement Lambda resolvers
4. Deploy to AWS
5. Run nightly probes
6. Monitor SLI dashboards
7. Submit to Kiroween hackathon! 🚀

---

**Version**: 1.0
**Created**: 2025-11-13
**Status**: Ready for Kiro IDE
