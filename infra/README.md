# Scrum Reborn Infrastructure

AWS CDK infrastructure for the Scrum Reborn AppSync migration.

## Architecture

- **API**: AWS AppSync (GraphQL with WebSocket subscriptions)
- **Database**: DynamoDB (single-table design)
- **Auth**: Cognito User Pools
- **Compute**: Lambda (Node.js 20)
- **Monitoring**: CloudWatch

## Prerequisites

- Node.js 20+
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

```bash
cd infra
npm install
```

## Build

Build Lambda functions:

```bash
npm run build
```

## Deploy

First-time setup (bootstrap CDK):

```bash
cdk bootstrap
```

Deploy the stack:

```bash
npm run deploy
```

## Useful Commands

- `npm run build` - Compile TypeScript and bundle Lambda functions
- `npm run watch` - Watch for changes and compile
- `npm run synth` - Synthesize CloudFormation template
- `npm run deploy` - Deploy stack to AWS
- `npm run destroy` - Remove all resources

## Stack Outputs

After deployment, the stack outputs:

- `GraphQLEndpoint` - AppSync GraphQL API URL
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito Client ID

Use these values to configure the frontend.

## Directory Structure

```
infra/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   └── scrum-realtime-stack.ts  # Main stack definition
├── lambda/
│   ├── mutations/          # GraphQL mutations resolver
│   └── tally/              # Vote tally processor
├── graphql/
│   └── schema.graphql      # GraphQL schema
├── cdk.json                # CDK configuration
├── tsconfig.json           # TypeScript configuration
├── esbuild.mjs             # Lambda bundler
└── package.json            # Dependencies
```
