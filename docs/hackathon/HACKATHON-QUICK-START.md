# Kiroween Hackathon - Quick Start Guide

## 🎯 Goal
Transform your scrum-web-app from **50% P2P connectivity** to **99.5% serverless reliability** using AWS AppSync + DynamoDB, demonstrating Kiro-first development for the Kiroween hackathon.

---

## 📁 What's Been Created

All Kiro artifacts and planning documents are ready:

### ✅ Kiro Specs (`.kiro/specs/`)
- **domain.yaml**: Entities (Room, Story, Vote), SLIs (99.5% connectivity, <250ms latency), business rules
- **flows.yaml**: User flows (join room, cast vote, reveal), event choreography, timing budgets
- **connectors.yaml**: Domo dashboards, CloudWatch metrics, Slack alerts, synthetic monitoring

### ✅ Kiro Hooks (`.kiro/hooks/`)
- **on_spec_change_generate_tests.yaml**: Auto-validate specs, generate GraphQL, run tests on changes
- **nightly_sli_probe.yaml**: Daily E2E tests measuring connectivity and latency SLIs
- **on_deploy_success.yaml**: Post-deployment smoke tests and config updates

### ✅ Kiro Steering (`.kiro/steering/`)
- **foundation.md**: Tone, naming conventions, UX principles, error handling philosophy

### ✅ Kiro MCP (`.kiro/mcp/`)
- **servers.json**: Integration configs for Domo, Slack, CloudWatch, AppSync, DynamoDB

### ✅ Planning Documents
- **KIROWEEN-EXECUTION-PLAN.md**: 3-day implementation timeline, phase-by-phase breakdown
- **ARCHITECTURE-TRANSFORMATION.md**: Detailed technical comparison (P2P vs AppSync)
- **reborn-spec.md**: Complete infrastructure scaffold (already in your repo)

---

## 🚀 Next Steps (Use with Kiro IDE)

### Day 1 Morning: Infrastructure (3 hours)

1. **Validate Kiro specs**:
   ```bash
   kiro validate specs
   ```

2. **Generate GraphQL schema from domain**:
   ```bash
   kiro generate graphql --from .kiro/specs/domain.yaml --out infra/graphql/schema.graphql
   ```

3. **Bootstrap AWS CDK**:
   ```bash
   mkdir infra && cd infra
   npm init -y
   npm install aws-cdk-lib constructs esbuild typescript @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb uuid
   ```

4. **Copy scaffold from reborn-spec.md**:
   - `infra/bin/infra.ts`
   - `infra/lib/scrum-realtime-stack.ts`
   - `infra/cdk.json`
   - `infra/tsconfig.json`
   - `infra/esbuild.mjs`

5. **Deploy minimal stack**:
   ```bash
   npm run build
   npx cdk bootstrap
   npx cdk deploy
   ```

### Day 1 Afternoon: Lambda Resolvers (4 hours)

6. **Implement mutations Lambda** (`infra/lambda/mutations/index.ts`):
   - createRoom, joinRoom, createStory, castVote, revealVotes

7. **Implement queries Lambda**:
   - getRoom, getRoomByCode, listStories, listRetro

8. **Deploy and test**:
   ```bash
   npm run build
   npm run cdk:deploy
   ```

### Day 1 Evening: Tally Processor (2 hours)

9. **Implement DynamoDB Streams Lambda** (`infra/lambda/tally/index.ts`):
   - Listen for vote INSERT/REMOVE
   - Recompute voteCount and avgVote
   - Update story record

10. **Wire up stream trigger in stack**

### Day 2 Morning: Frontend Integration (4 hours)

11. **Install AWS Amplify**:
    ```bash
    npm install @aws-amplify/api-graphql @aws-amplify/auth aws-amplify
    ```

12. **Replace PeerJS with GraphQL**:
    - Remove `hooks/useCollaboration.ts`
    - Add `hooks/useGraphQL.ts` and `hooks/useSubscription.ts`
    - Update `App.tsx` state management

13. **Test multi-device sync**

### Day 2 Afternoon: Auth & Observability (5 hours)

14. **Implement sign-up/sign-in flow** (`components/AuthFlow.tsx`)

15. **Add CloudWatch metrics** to Lambda resolvers

16. **Deploy nightly probe**:
    ```bash
    kiro deploy hook nightly_sli_probe --target aws-lambda
    ```

17. **Set up Domo ETL pipeline** (optional)

### Day 3: Polish & Hackathon Prep (4 hours)

18. **UI/UX refinements**: Connection status, error toasts, animations

19. **Create demo dataset**: Test users, sample rooms/stories

20. **Record 5-minute demo video**:
    - Show problem (P2P disconnects)
    - Show solution (AppSync architecture)
    - Live multi-device demo
    - Show Kiro artifacts
    - Highlight metrics (99.5%, <250ms)

21. **Submit to Devpost**:
    - Upload demo video
    - Link GitHub repo
    - Deploy live demo URL
    - Write compelling description

---

## 📊 Success Metrics

### Technical
- [ ] 99.5%+ connectivity in load tests
- [ ] <250ms p95 pub/sub latency
- [ ] <2s p95 vote tally latency
- [ ] Zero critical bugs

### Hackathon
- [ ] 5-minute demo video uploaded
- [ ] GitHub repo public with Kiro artifacts
- [ ] Live demo accessible
- [ ] Devpost submission complete

---

## 🎥 Demo Script (5 Minutes)

**Minute 1**: Problem
- "Teams struggle with unreliable tools. Our app had 50% connectivity due to P2P NAT issues."
- Show old app disconnecting

**Minute 2**: Solution
- "Scrum Reborn uses AWS AppSync for guaranteed 99.5% connectivity."
- Show architecture diagram (P2P → AppSync)

**Minutes 3-4**: Live Demo
- Create room on laptop
- Join from phone (<2s)
- Vote on both devices
- Reveal votes (<250ms sync)
- Add retro note

**Minute 5**: Kiro Integration
- Show `.kiro/specs/domain.yaml`
- Show nightly probe hook
- Show Domo SLI dashboard
- "From 50% to 99.5% = 99x improvement. Kiro made it happen."

---

## 🔗 Key Resources

- **Kiro IDE**: (Use for spec validation, code generation, hook deployment)
- **Execution Plan**: `KIROWEEN-EXECUTION-PLAN.md` (detailed timeline)
- **Architecture Guide**: `ARCHITECTURE-TRANSFORMATION.md` (technical deep dive)
- **CDK Scaffold**: `reborn-spec.md` (copy-paste infrastructure code)
- **Kiro Specs**: `.kiro/specs/` (domain, flows, connectors)

---

## 💡 Pro Tips

1. **Use Kiro IDE to generate GraphQL schema** from domain.yaml (saves hours)
2. **Deploy early, test often** (CDK makes it easy to iterate)
3. **Focus on core flows first** (create room, join, vote, reveal)
4. **Leverage nightly probe** to catch regressions automatically
5. **Show Domo dashboards in demo** (judges love data-driven claims)

---

## 🆘 Troubleshooting

**CDK deploy fails?**
→ Run `aws configure` and set credentials

**AppSync 401 Unauthorized?**
→ Check Cognito token is valid, re-login

**Subscriptions not working?**
→ Verify WebSocket connection in DevTools

**High latency?**
→ Check Lambda cold starts, add provisioned concurrency

---

## 🏆 Winning the Hackathon

**Key Differentiators:**
1. **Real Problem**: 50% → 99.5% connectivity is a 99x improvement
2. **Kiro-First**: Specs before code, hooks automate testing
3. **Measurable Impact**: SLIs with concrete targets
4. **Production-Ready**: Deployable, not just a demo
5. **Open Source**: Reusable patterns for the community

**Judging Criteria Alignment:**
- ✅ **Innovation**: P2P → AppSync for Scrum is novel
- ✅ **Technical Execution**: CDK, DynamoDB Streams, GraphQL subscriptions
- ✅ **Kiro Integration**: Specs, hooks, MCP connectors, steering
- ✅ **Impact**: Teams can finally trust their planning tools

---

## 🚀 Let's Build a Winner!

You have everything you need:
- ✅ Complete Kiro artifacts
- ✅ Detailed execution plan
- ✅ Infrastructure scaffold
- ✅ Migration strategy

**Now fire up Kiro IDE and start building!**

Good luck! 🍀

---

**Created**: 2025-11-13
**Status**: Ready to Execute
