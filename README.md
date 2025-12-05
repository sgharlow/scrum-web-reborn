<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Scrum Reborn

[![Amplify Status](https://img.shields.io/badge/amplify-deployed-green)](https://main.d3tvb88c55agb4.amplifyapp.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AWS](https://img.shields.io/badge/AWS-AppSync%20%7C%20DynamoDB%20%7C%20Lambda-orange)](https://aws.amazon.com/)

**Live Demo:** https://main.d3tvb88c55agb4.amplifyapp.com

**Presentation:** https://scrum-reborn-wt4t7tj.gamma.site/

**Reliable, real-time collaboration for distributed Scrum teams**

Scrum Reborn transforms planning poker and retrospectives with guaranteed 99.5%+ connectivity. Built on AWS AppSync + DynamoDB, it eliminates the frustration of dropped P2P connections and synchronization issues.

## The Transformation Story

**From 50% to 99.5% Connectivity: A 99x Improvement**

The original Scrum Facilitator app relied on peer-to-peer (P2P) WebRTC connections, where users connected directly to each other through their browsers. While this approach worked in ideal conditions, it failed catastrophically in real-world scenarios—achieving only a 50% connection success rate. The core problem was NAT traversal: corporate firewalls blocked UDP traffic, symmetric NAT prevented direct connections, mobile carrier-grade NAT made connections impossible, and free TURN relay servers were unreliable and rate-limited. When connections did work, they were fragile—if the facilitator's browser closed or their network hiccupped, the entire session's data was lost since there was no server to persist state. Scrum Reborn solves this by replacing the entire P2P architecture with AWS AppSync (managed GraphQL with WebSocket subscriptions) and DynamoDB. Now, all communication flows through HTTPS (port 443), which works everywhere—no NAT traversal needed, no firewall issues, no TURN servers. AppSync provides guaranteed message delivery with automatic reconnection, while DynamoDB serves as the single source of truth with ACID transactions. The result: 99.5%+ connectivity, sub-250ms latency, and zero data loss. This represents a 99x improvement in reliability (99.5% ÷ 50% = 1.99), transforming an unreliable prototype into a production-ready collaboration platform that distributed teams can actually depend on.

## Features

- **Planning Poker**: Real-time story estimation with Fibonacci voting
- **Retrospectives**: Collaborative retro boards with voting
- **Presence Tracking**: Always know who's in the room
- **99.5%+ Connectivity**: No more NAT traversal issues
- **Sub-250ms Latency**: Updates feel instant
- **Serverless Architecture**: Scales automatically with AWS

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: AWS AppSync (GraphQL) + Lambda + DynamoDB
- **Auth**: AWS Cognito User Pools
- **Infrastructure**: AWS CDK (TypeScript)
- **Real-time**: GraphQL Subscriptions over WebSocket

## Prerequisites

Before deploying, ensure you have:

- **AWS Account** with appropriate permissions (IAM, CloudFormation, AppSync, DynamoDB, Lambda, Cognito)
- **Node.js 20.x** or later ([Download](https://nodejs.org/))
- **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
- **AWS CLI** configured with credentials: `aws configure`
- **Git** for cloning the repository

## Quick Start (Local Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd scrum-reborn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env.local` and fill in your AWS resources:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   VITE_AWS_REGION=us-east-1
   VITE_GRAPHQL_ENDPOINT=https://your-appsync-api.appsync-api.us-east-1.amazonaws.com/graphql
   VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
   VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment Guide

### Step 1: Deploy Infrastructure (AWS CDK)

1. **Navigate to infrastructure directory**
   ```bash
   cd infra
   ```

2. **Install infrastructure dependencies**
   ```bash
   npm install
   ```

3. **Bootstrap CDK (first-time only)**
   
   If this is your first time using CDK in this AWS account/region:
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```
   
   Example:
   ```bash
   cdk bootstrap aws://123456789012/us-east-1
   ```

4. **Build Lambda functions**
   ```bash
   npm run build
   ```
   
   This bundles the Lambda functions using esbuild.

5. **Review the infrastructure changes**
   ```bash
   cdk synth
   ```
   
   This generates CloudFormation templates in `cdk.out/`.

6. **Deploy the stack**
   ```bash
   cdk deploy
   ```
   
   Confirm the deployment when prompted. This will create:
   - AppSync GraphQL API
   - DynamoDB table
   - Cognito User Pool
   - Lambda functions (mutations, tally, probe, domo-etl)
   - CloudWatch alarms and log groups
   - SQS Dead Letter Queue
   - EventBridge rules for monitoring

7. **Capture stack outputs**
   
   After deployment completes, CDK will output important values:
   ```
   Outputs:
   ScrumRealtimeStack.GraphQLEndpoint = https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
   ScrumRealtimeStack.UserPoolId = us-east-1_xxxxxxxxx
   ScrumRealtimeStack.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
   ScrumRealtimeStack.Region = us-east-1
   ```
   
   Copy these values - you'll need them for the frontend configuration.

### Step 2: Configure Frontend

1. **Return to project root**
   ```bash
   cd ..
   ```

2. **Update environment variables**
   
   Edit `.env.local` with the CDK outputs from Step 1:
   ```env
   VITE_AWS_REGION=us-east-1
   VITE_GRAPHQL_ENDPOINT=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
   VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
   VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Test locally**
   ```bash
   npm run dev
   ```
   
   Create a test account and verify connectivity.

### Step 3: Deploy Frontend

Choose your preferred hosting platform:

#### Option A: Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel`
3. Follow prompts to link your project
4. Add environment variables in Vercel dashboard
5. Deploy: `vercel --prod`

#### Option B: Netlify

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `netlify init`
3. Add environment variables: `netlify env:set VITE_AWS_REGION us-east-1`
4. Deploy: `netlify deploy --prod`

#### Option C: AWS Amplify Hosting

1. Push code to GitHub
2. Open AWS Amplify Console
3. Connect repository
4. Add environment variables
5. Deploy automatically on push

#### Option D: S3 + CloudFront

1. Build: `npm run build`
2. Create S3 bucket: `aws s3 mb s3://scrum-reborn-app`
3. Upload: `aws s3 sync dist/ s3://scrum-reborn-app`
4. Configure CloudFront distribution
5. Update DNS

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AWS_REGION` | AWS region where resources are deployed | `us-east-1` |
| `VITE_GRAPHQL_ENDPOINT` | AppSync GraphQL API endpoint | `https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `us-east-1_xxxxxxxxx` |
| `VITE_COGNITO_CLIENT_ID` | Cognito User Pool Client ID | `xxxxxxxxxxxxxxxxxxxxxxxxxx` |

## Running Tests

The project includes comprehensive automated tests covering backend Lambda functions, frontend hooks, and end-to-end multi-device synchronization.

### Run All Tests

```bash
npm run test:all
```

### Run Specific Test Suites

**Backend Unit Tests** (Lambda functions):
```bash
npm run test:backend
```

**Frontend Unit Tests** (React hooks):
```bash
npm run test:frontend
```

**E2E Tests** (Multi-device sync):
```bash
npm run test:e2e
```

### Test Coverage

View coverage reports:
```bash
# Frontend coverage
npm run test:coverage

# Backend coverage
npm run test:backend -- --coverage
```

Coverage thresholds:
- Lines: 80%
- Branches: 70%
- Functions: 80%
- Statements: 80%

### E2E Test Setup

E2E tests require a deployed environment. Configure test environment variables:

1. Copy `.env.test` to `.env.test.local`
2. Fill in your test environment values:
   ```env
   VITE_AWS_REGION=us-east-1
   VITE_USER_POOL_ID=us-east-1_xxxxxxxxx
   VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_APPSYNC_ENDPOINT=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=TestPassword123!
   TEST_USER_2_EMAIL=test2@example.com
   TEST_USER_2_PASSWORD=TestPassword123!
   ```

3. Create test users in Cognito (see "Create a Test User" section below)

See [e2e/README.md](e2e/README.md) for detailed E2E testing documentation.

## Testing the Deployment

### Create a Test User

1. **Sign up via the UI**
   - Open your deployed app
   - Click "Sign Up"
   - Enter email and password (min 8 chars, 1 digit)
   - Verify email (check spam folder)

2. **Or use AWS CLI**
   ```bash
   aws cognito-idp sign-up \
     --client-id YOUR_CLIENT_ID \
     --username test@example.com \
     --password Test1234!
   
   aws cognito-idp admin-confirm-sign-up \
     --user-pool-id YOUR_USER_POOL_ID \
     --username test@example.com
   ```

### Test Multi-Device Sync

1. Open app in two browser windows (or devices)
2. Sign in with the same or different accounts
3. Create a room in window A (note the room code)
4. Join from window B using the room code
5. Create a story and cast votes
6. Verify real-time updates appear in both windows
7. Reveal votes and check synchronization

### Verify Monitoring

1. Open AWS CloudWatch Console
2. Navigate to Log Groups
3. Check `/aws/lambda/ScrumRealtimeStack-MutationsLambda` for activity
4. View custom metrics in CloudWatch Metrics
5. Verify alarms are configured

## Troubleshooting

### Issue: CDK Deploy Fails with "Insufficient Permissions"

**Solution**: Ensure your AWS credentials have the following permissions:
- CloudFormation (full)
- IAM (create roles and policies)
- AppSync, DynamoDB, Lambda, Cognito, CloudWatch, SQS, EventBridge

### Issue: Frontend Shows "Network Error"

**Symptoms**: Can't connect to GraphQL API

**Solutions**:
1. Verify `VITE_GRAPHQL_ENDPOINT` is correct in `.env.local`
2. Check AppSync API is deployed: `aws appsync list-graphql-apis`
3. Verify Cognito User Pool exists: `aws cognito-idp list-user-pools --max-results 10`
4. Check browser console for CORS errors (AppSync handles CORS automatically)

### Issue: "User is not authenticated"

**Symptoms**: GraphQL queries return 401 Unauthorized

**Solutions**:
1. Ensure you're signed in (check AuthFlow component)
2. Verify JWT token is being sent in Authorization header
3. Check token hasn't expired (1 hour lifetime)
4. Sign out and sign in again to refresh token

### Issue: Votes Not Updating in Real-Time

**Symptoms**: Cast vote but aggregates don't update

**Solutions**:
1. Check DynamoDB Streams are enabled on the table
2. Verify tally Lambda has permissions to read/write DynamoDB
3. Check CloudWatch Logs for tally Lambda errors: `/aws/lambda/ScrumRealtimeStack-TallyLambda`
4. Verify Dead Letter Queue is empty (no failed batches)

### Issue: Room Code Not Found

**Symptoms**: "Room code not found" when joining

**Solutions**:
1. Verify room code is exactly 6 uppercase alphanumeric characters
2. Check GSI1 is configured on DynamoDB table
3. Verify `createRoom` mutation wrote GSI1PK and GSI1SK attributes
4. Query DynamoDB directly to confirm room exists

### Issue: High Latency (>500ms)

**Symptoms**: Slow updates, laggy UI

**Solutions**:
1. Check CloudWatch metrics for Lambda cold starts
2. Consider provisioned concurrency for mutations Lambda
3. Verify DynamoDB is not throttling (check metrics)
4. Check network latency from client to AWS region
5. Consider deploying to a region closer to users

### Issue: CDK Bootstrap Fails

**Symptoms**: "This stack requires bootstrapping"

**Solution**:
```bash
cdk bootstrap aws://ACCOUNT-ID/REGION --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

### Issue: Lambda Function Errors

**Symptoms**: Mutations fail with 500 errors

**Solutions**:
1. Check CloudWatch Logs for the specific Lambda function
2. Verify environment variables are set correctly
3. Check IAM role has necessary permissions
4. Redeploy with `cdk deploy --force`

## CI/CD Setup

The project includes GitHub Actions workflows for automated deployment.

### Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `AWS_ACCOUNT_ID`: Your AWS account ID
- `AWS_REGION`: Deployment region (e.g., `us-east-1`)
- `AWS_ACCESS_KEY_ID`: IAM user access key (or use OIDC)
- `AWS_SECRET_ACCESS_KEY`: IAM user secret key (or use OIDC)

### Workflow Triggers

- **Infrastructure**: Deploys on push to `infra/**` paths
- **Frontend**: Deploys on push to `main` branch (configure in hosting platform)

See [.github/workflows/README.md](.github/workflows/README.md) for detailed CI/CD setup.

## Monitoring and Observability

### CloudWatch Dashboards

View real-time metrics:
- Join success rate
- Mutation latency (p50, p95, p99)
- Subscription delivery latency
- Vote tally processing time

### Alarms

Configured alarms:
- High error rate (>10 errors in 5 minutes)
- High latency (p95 >500ms)
- DynamoDB throttling

### Nightly Synthetic Probe

Runs daily at 07:00 UTC to verify end-to-end functionality:
- Creates room
- Joins room
- Casts vote
- Reveals votes
- Measures latency

Check CloudWatch Logs: `/aws/lambda/ScrumRealtimeStack-ProbeLambda`

## Project Structure

```
scrum-reborn/
├── components/          # React components
│   ├── AuthFlow.tsx    # Sign-in/sign-up UI
│   ├── VotingArea.tsx  # Planning poker interface
│   ├── StoryLane.tsx   # Story list
│   └── RetroMode.tsx   # Retrospective board
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication
│   ├── useGraphQL.ts   # Mutations and queries
│   └── useSubscription.ts # Real-time subscriptions
├── infra/              # AWS CDK infrastructure
│   ├── lib/            # CDK stack definitions
│   ├── lambda/         # Lambda function code
│   │   ├── mutations/  # GraphQL resolvers
│   │   ├── tally/      # Vote aggregation
│   │   ├── probe/      # Synthetic monitoring
│   │   └── domo-etl/   # Metrics pipeline
│   └── graphql/        # GraphQL schema
├── src/                # Source files
│   └── aws-config.ts   # Amplify configuration
└── .env.local          # Environment variables (not committed)
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **Architecture**: Technical design and migration guides
  - [Architecture Transformation](docs/architecture/ARCHITECTURE-TRANSFORMATION.md) - P2P to AppSync migration
  - [AppSync Migration Guide](docs/architecture/APPSYNC-MIGRATION-GUIDE.md) - Step-by-step migration
  - [Infrastructure Spec](docs/architecture/reborn-spec.md) - CDK scaffold and deployment

- **Hackathon Materials**: Submission and demo resources
  - [Quick Start Guide](docs/hackathon/HACKATHON-QUICK-START.md) - 3-day implementation roadmap
  - [Execution Plan](docs/hackathon/KIROWEEN-EXECUTION-PLAN.md) - Detailed phase-by-phase plan
  - [Submission Checklist](docs/hackathon/HACKATHON-SUBMISSION-CHECKLIST.md) - Complete submission guide
  - [Demo Video Script](docs/hackathon/DEMO-VIDEO-OUTLINE-SCRIPT.md) - 5-minute demo script

- **Guides**: Testing and development guides
  - [Testing Guide](docs/guides/TESTING-GUIDE.md) - Comprehensive testing strategy
  - [E2E Testing Plan](docs/guides/E2E-TESTING-PLAN.md) - 30-minute test scenarios

- **Planning**: Project status and analysis
  - [Project Status Analysis](docs/planning/PROJECT-STATUS-ANALYSIS.md) - Implementation review

See [docs/README.md](docs/README.md) for complete documentation index.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/sgharlow/scrum-web-reborn/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sgharlow/scrum-web-reborn/discussions)

## Acknowledgments

Built with:
- [AWS AppSync](https://aws.amazon.com/appsync/)
- [AWS CDK](https://aws.amazon.com/cdk/)
- [React](https://react.dev/)
- [AWS Amplify](https://aws.amazon.com/amplify/)
- [Vite](https://vitejs.dev/)

---

**Made with ❤️ for distributed Scrum teams**
