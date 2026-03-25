# Scrum Reborn

Real-time Scrum collaboration tool (planning poker + retrospectives) for distributed teams. Rebuilt from a P2P WebRTC architecture to AWS AppSync + DynamoDB, achieving 99.5%+ connectivity (up from 50%).

## Tech Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 6
- **Backend**: AWS AppSync (GraphQL), Lambda, DynamoDB
- **Auth**: AWS Cognito User Pools
- **Infrastructure**: AWS CDK (TypeScript)
- **Real-time**: GraphQL Subscriptions over WebSocket
- **Testing**: Jest (frontend + backend), Playwright (E2E)
- **Hosting**: AWS Amplify

## Key Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # Production build
npm test                 # Run frontend Jest tests
npm run test:backend     # Run backend Lambda tests
npm run test:all         # Run all test suites
npm run test:e2e         # Run Playwright E2E tests
npm run test:coverage    # Frontend coverage report
```

### Infrastructure (CDK)

```bash
cd infra
npm install
npm run build            # Bundle Lambda functions
cdk synth                # Generate CloudFormation
cdk deploy               # Deploy stack to AWS
```

## Architecture

### Core Components

- **`components/`** - React UI: AuthFlow, VotingArea, StoryLane, RetroMode
- **`hooks/`** - useAuth, useGraphQL, useSubscription
- **`infra/lambda/`** - Lambda functions: mutations, tally (vote aggregation), probe (synthetic monitoring), domo-etl
- **`infra/graphql/`** - GraphQL schema
- **`src/aws-config.ts`** - Amplify configuration

### Data Flow

1. User creates/joins room via Cognito auth
2. Actions (vote, reveal, story CRUD) go through AppSync mutations
3. Lambda resolvers write to DynamoDB
4. AppSync subscriptions push real-time updates to all connected clients
5. Tally Lambda aggregates votes on DynamoDB stream events

### Environment Variables

```
VITE_AWS_REGION
VITE_GRAPHQL_ENDPOINT
VITE_COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID
```

## Testing

- 111 test files across frontend, backend, and E2E suites
- Coverage thresholds: 80% lines, 70% branches, 80% functions
- E2E tests validate multi-device real-time sync

## Deployment

- **Live**: https://main.d3tvb88c55agb4.amplifyapp.com
- **CI/CD**: GitHub Actions for infra and frontend deploys
- **Monitoring**: CloudWatch dashboards, alarms, nightly synthetic probe
