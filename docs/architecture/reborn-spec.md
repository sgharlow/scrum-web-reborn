Awesome — here’s a clean, **ready-to-commit scaffold** for **Approach A** that you can drop into your existing repo (I’ll assume your root is `scrum-web-app/`). It includes:

* AWS CDK (TypeScript) infra: **AppSync API**, **DynamoDB single-table**, **Cognito auth**, **Lambda resolvers**, **DynamoDB Streams tally processor**
* GraphQL schema + subscriptions
* Minimal, production-lean **resolver code** (Node 20 + AWS SDK v3, bundled with esbuild)
* CI via **GitHub Actions** (deploy CDK)
* A lightweight **/.kiro** tree for Kiroween (specs, hooks, steering, MCP placeholders)

---

# 1) Repo layout (add these at the project root)

```
scrum-web-app/
├─ infra/                          # CDK app & deployable infra
│  ├─ bin/
│  │  └─ infra.ts
│  ├─ lib/
│  │  └─ scrum-realtime-stack.ts
│  ├─ graphql/
│  │  └─ schema.graphql
│  ├─ lambda/
│  │  ├─ mutations/
│  │  │  └─ index.ts
│  │  └─ tally/
│  │     └─ index.ts
│  ├─ package.json
│  ├─ cdk.json
│  ├─ tsconfig.json
│  └─ README.md
├─ .github/
│  └─ workflows/
│     └─ deploy-infra.yml
└─ /.kiro/
   ├─ specs/
   │  ├─ domain.yaml
   │  ├─ flows.yaml
   │  └─ connectors.yaml
   ├─ hooks/
   │  ├─ on_save_generate_tests.yaml
   │  └─ nightly_room_slo_probe.yaml
   ├─ steering/
   │  └─ foundation.md
   └─ mcp/
      └─ servers.json
```

> If you’d rather keep infra separate, you can also make this a sibling repo. This layout keeps it simple for the hackathon: app + infra + Kiroween evidence all together.

---

# 2) CDK app boilerplate

## `infra/package.json`

```json
{
  "name": "scrum-realtime-infra",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p . && node ./esbuild.mjs",
    "cdk:synth": "npm run build && cdk synth",
    "cdk:deploy": "npm run build && cdk deploy --require-approval never",
    "cdk:destroy": "cdk destroy",
    "lint": "echo 'add your linter here'",
    "test": "echo 'add unit tests here'"
  },
  "devDependencies": {
    "aws-cdk-lib": "^2.153.0",
    "constructs": "^10.3.0",
    "esbuild": "^0.23.1",
    "typescript": "^5.6.3"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.637.0",
    "@aws-sdk/lib-dynamodb": "^3.637.0",
    "uuid": "^9.0.1"
  }
}
```

## `infra/cdk.json`

```json
{
  "app": "node --no-warnings --experimental-specifier-resolution=node bin/infra.js",
  "context": {
    "@aws-cdk/core:newStyleStackSynthesis": true
  }
}
```

## `infra/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "strict": true
  },
  "include": ["bin", "lib", "lambda"]
}
```

## Tiny bundler helper (so Lambdas are single-file)

Create `infra/esbuild.mjs`:

```js
import { build } from 'esbuild';

const entries = [
  { in: 'lambda/mutations/index.ts', out: 'dist/lambda/mutations/index.mjs' },
  { in: 'lambda/tally/index.ts', out: 'dist/lambda/tally/index.mjs' }
];

await Promise.all(entries.map(({ in: entryPoints, out: outfile }) =>
  build({
    entryPoints: [entryPoints],
    outfile,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    bundle: true,
    minify: false,
    sourcemap: true,
    external: [] // keep AWS SDK v3 bundled for portability
  })
));
```

## `infra/bin/infra.ts`

```ts
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { ScrumRealtimeStack } from '../lib/scrum-realtime-stack.js';

const app = new App();
new ScrumRealtimeStack(app, 'ScrumRealtimeStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  }
});
```

## `infra/lib/scrum-realtime-stack.ts`

```ts
import {
  Duration, RemovalPolicy, Stack, StackProps, CfnOutput
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'node:path';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class ScrumRealtimeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1) Auth (Cognito User Pool)
    const userPool = new cognito.UserPool(this, 'ScrumUserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true, username: true },
      passwordPolicy: { minLength: 8, requireLowercase: true, requireUppercase: false, requireDigits: true, requireSymbols: false },
      removalPolicy: RemovalPolicy.DESTROY
    });
    const userPoolClient = new cognito.UserPoolClient(this, 'ScrumUserPoolClient', {
      userPool,
      authFlows: { userPassword: true, userSrp: true }
    });

    // 2) DynamoDB single-table
    const table = new dynamodb.Table(this, 'ScrumRealtimeTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey:      { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: 'ttl'
    });
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey:      { name: 'GSI1SK', type: dynamodb.AttributeType.STRING }
    });

    // 3) AppSync API
    const api = new appsync.GraphqlApi(this, 'ScrumApi', {
      name: 'scrum-realtime-api',
      definition: appsync.Definition.fromFile(path.join(process.cwd(), 'graphql', 'schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool }
        }
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ERROR
      },
      xrayEnabled: true
    });

    // 4) Lambda: mutations/queries resolver
    const mutationsFn = new lambda.Function(this, 'MutationsFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(process.cwd(), 'dist', 'lambda', 'mutations')),
      timeout: Duration.seconds(15),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });
    table.grantReadWriteData(mutationsFn);

    const lambdaDs = api.addLambdaDataSource('LambdaDS', mutationsFn);

    // Attach resolvers (all mutations + queries go to Lambda; subscriptions are wired via @aws_subscribe)
    const mutations = [
      'createRoom','setRoomStage','joinRoom','leaveRoom','setPresence',
      'createStory','updateStory','deleteStory',
      'castVote','retractVote','revealVotes',
      'addRetroNote','voteRetroNote'
    ];
    mutations.forEach((f) => lambdaDs.createResolver('Mutation'+f, { typeName: 'Mutation', fieldName: f }));

    const queries = ['getRoom','getRoomByCode','listRooms','getStory','listStories','listRetro'];
    queries.forEach((f) => lambdaDs.createResolver('Query'+f, { typeName: 'Query', fieldName: f }));

    // 5) DynamoDB Streams tally processor (updates aggregates, optional presence cleanup)
    const tallyFn = new lambda.Function(this, 'TallyFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(process.cwd(), 'dist', 'lambda', 'tally')),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });
    table.grantReadWriteData(tallyFn);
    tallyFn.addEventSourceMapping('DdbStream', {
      eventSourceArn: table.tableStreamArn!,
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 50,
      bisectBatchOnError: true,
      retryAttempts: 3
    });

    // 6) Optional: nightly probe (synthetic pub/sub) placeholder — disabled by default
    const rule = new events.Rule(this, 'NightlyProbeRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '7' }) // 07:00 UTC
    });
    rule.addTarget(new targets.LambdaFunction(mutationsFn, {
      event: events.RuleTargetInput.fromObject({ action: 'syntheticProbe' })
    }));

    new CfnOutput(this, 'GraphqlUrl', { value: api.graphqlUrl });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
```

---

# 3) GraphQL schema (drop-in)

`infra/graphql/schema.graphql`
*(Same model we discussed; trimmed comments to keep it tidy.)*

```graphql
scalar AWSDateTime
scalar AWSJSON

enum RoomStage { PLANNING VOTING RETRO CLOSED }
enum RetroCategory { START STOP CONTINUE KUDOS ISSUE }
enum PresenceState { ONLINE AWAY OFFLINE }
enum Role { MODERATOR MEMBER OBSERVER }

type Room {
  id: ID!
  name: String!
  code: String!
  stage: RoomStage!
  sprint: String
  createdBy: ID!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Member {
  userId: ID!
  displayName: String!
  role: Role!
  state: PresenceState!
  lastSeen: AWSDateTime!
}

type Story {
  id: ID!
  roomId: ID!
  title: String!
  description: String
  status: String
  tags: [String!]
  createdBy: ID!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  voteCount: Int!
  avgVote: Float
  revealed: Boolean!
}

type Vote {
  id: ID!
  roomId: ID!
  storyId: ID!
  userId: ID!
  value: String!
  createdAt: AWSDateTime!
}

type RetroNote {
  id: ID!
  roomId: ID!
  category: RetroCategory!
  text: String!
  authorId: ID!
  createdAt: AWSDateTime!
  votes: Int!
}

type StoryConnection { items: [Story!]!, nextToken: String }
type RetroNoteConnection { items: [RetroNote!]!, nextToken: String }

type Query {
  getRoom(id: ID!): Room
  getRoomByCode(code: String!): Room
  listRooms(limit: Int, nextToken: String): [Room!]!

  getStory(roomId: ID!, storyId: ID!): Story
  listStories(roomId: ID!, limit: Int, nextToken: String): StoryConnection!
  listRetro(roomId: ID!, limit: Int, nextToken: String): RetroNoteConnection!
}

type Mutation {
  createRoom(name: String!, code: String!, sprint: String): Room!
  setRoomStage(roomId: ID!, stage: RoomStage!): Room!
  joinRoom(roomCode: String!, displayName: String!, role: Role = MEMBER): Member!
  leaveRoom(roomId: ID!): Boolean!

  setPresence(roomId: ID!, state: PresenceState!, displayName: String!): Member!

  createStory(roomId: ID!, title: String!, description: String, tags: [String!]): Story!
  updateStory(roomId: ID!, storyId: ID!, title: String, description: String, status: String, tags: [String!]): Story!
  deleteStory(roomId: ID!, storyId: ID!): Boolean!

  castVote(roomId: ID!, storyId: ID!, value: String!): Vote!
  retractVote(roomId: ID!, storyId: ID!): Boolean!
  revealVotes(roomId: ID!, storyId: ID!, reveal: Boolean!): Story!

  addRetroNote(roomId: ID!, category: RetroCategory!, text: String!): RetroNote!
  voteRetroNote(roomId: ID!, retroId: ID!, delta: Int!): RetroNote!
}

type Subscription {
  onRoomEvent(roomId: ID!): RoomEvent!
    @aws_subscribe(mutations: [
      "createStory","updateStory","deleteStory",
      "castVote","retractVote","revealVotes",
      "addRetroNote","voteRetroNote",
      "setPresence","setRoomStage","joinRoom","leaveRoom"
    ])

  onStoryChanged(roomId: ID!): Story!
    @aws_subscribe(mutations: ["createStory","updateStory","deleteStory","revealVotes"])

  onVoteChanged(roomId: ID!, storyId: ID!): Vote!
    @aws_subscribe(mutations: ["castVote","retractVote"])

  onRetroChanged(roomId: ID!): RetroNote!
    @aws_subscribe(mutations: ["addRetroNote","voteRetroNote"])

  onPresenceChanged(roomId: ID!): Member!
    @aws_subscribe(mutations: ["setPresence","joinRoom","leaveRoom"])

  onStageChanged(roomId: ID!): Room!
    @aws_subscribe(mutations: ["setRoomStage"])
}

union RoomEvent = StoryEvent | VoteEvent | RetroEvent | PresenceEvent | StageEvent

type StoryEvent { type: String!, roomId: ID!, story: Story! }
type VoteEvent { type: String!, roomId: ID!, vote: Vote! }
type RetroEvent { type: String!, roomId: ID!, note: RetroNote! }
type PresenceEvent { type: String!, roomId: ID!, member: Member! }
type StageEvent { type: String!, roomId: ID!, room: Room! }
```

---

# 4) Lambda resolvers (mutations/queries)

`infra/lambda/mutations/index.ts`

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const TABLE = process.env.TABLE_NAME!;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type Ctx = { arguments: any, identity?: { sub?: string, username?: string }, info: { fieldName: string } };

const nowIso = () => new Date().toISOString();
const userIdOf = (ctx: Ctx) => ctx?.identity?.sub || ctx?.identity?.username || 'anon';

export const handler = async (ctx: Ctx) => {
  const f = ctx.info.fieldName;
  switch (f) {
    // -------- Rooms --------
    case 'createRoom': return createRoom(ctx);
    case 'setRoomStage': return setRoomStage(ctx);
    case 'joinRoom': return joinRoom(ctx);
    case 'leaveRoom': return leaveRoom(ctx);

    // -------- Presence -----
    case 'setPresence': return setPresence(ctx);

    // -------- Stories ------
    case 'createStory': return createStory(ctx);
    case 'updateStory': return updateStory(ctx);
    case 'deleteStory': return deleteStory(ctx);
    case 'getStory': return getStory(ctx);
    case 'listStories': return listStories(ctx);

    // -------- Votes --------
    case 'castVote': return castVote(ctx);
    case 'retractVote': return retractVote(ctx);
    case 'revealVotes': return revealVotes(ctx);

    // -------- Retro --------
    case 'addRetroNote': return addRetro(ctx);
    case 'voteRetroNote': return voteRetro(ctx);
    case 'listRetro': return listRetro(ctx);

    // -------- Rooms Queries-
    case 'getRoom': return getRoom(ctx);
    case 'getRoomByCode': return getRoomByCode(ctx);
    case 'listRooms': return listRooms(ctx);

    // Synthetic probe (optional)
    default:
      if ((ctx as any).action === 'syntheticProbe') return { ok: true, at: nowIso() };
      throw new Error(`Unknown field ${f}`);
  }
};

// ========== ROOMS ==========
async function createRoom(ctx: Ctx) {
  const { name, code, sprint } = ctx.arguments;
  const id = randomUUID();
  const userId = userIdOf(ctx);
  const ts = nowIso();
  const item = {
    PK: `ROOM#${id}`,
    SK: `ROOM#${id}`,
    id, name, code, sprint,
    stage: 'PLANNING',
    createdBy: userId,
    createdAt: ts,
    updatedAt: ts
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }));
  return toRoom(item);
}

async function setRoomStage(ctx: Ctx) {
  const { roomId, stage } = ctx.arguments;
  const ts = nowIso();
  const res = await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `ROOM#${roomId}`, SK: `ROOM#${roomId}` },
    UpdateExpression: 'SET #stage = :s, updatedAt = :u',
    ExpressionAttributeNames: { '#stage': 'stage' },
    ExpressionAttributeValues: { ':s': stage, ':u': ts },
    ReturnValues: 'ALL_NEW'
  }));
  return toRoom(res.Attributes!);
}

async function joinRoom(ctx: Ctx) {
  const { roomCode, displayName, role = 'MEMBER' } = ctx.arguments;
  const userId = userIdOf(ctx);
  const room = await getRoomByCode({ ...ctx, arguments: { code: roomCode } });
  if (!room) throw new Error('Room code not found');

  const ts = nowIso();
  const item = {
    PK: `ROOM#${room.id}`,
    SK: `PRES#${userId}`,
    userId, displayName, role, state: 'ONLINE',
    lastSeen: ts,
    ttl: Math.floor(Date.now()/1000) + 90
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { userId, displayName, role, state: 'ONLINE', lastSeen: ts };
}

async function leaveRoom(ctx: Ctx) {
  const { roomId } = ctx.arguments;
  const userId = userIdOf(ctx);
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `ROOM#${roomId}`, SK: `PRES#${userId}` } }));
  return true;
}

async function getRoom(ctx: Ctx) {
  const { id } = ctx.arguments;
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `ROOM#${id}`, SK: `ROOM#${id}` } }));
  return res.Item ? toRoom(res.Item) : null;
}

async function getRoomByCode(ctx: Ctx) {
  const { code } = ctx.arguments;
  // Code is stored on the ROOM item; we do a scan-free approach by adding a GSI if you prefer. For simplicity here, use a Query on GSI1 where GSI1PK=ROOM_CODE#code.
  // If you want this path, uncomment the GSI write in createRoom and index definition; or store a Code->Room mapping item.
  // For now, write a mapping item on createRoom (left as TODO) or fallback to error:
  throw new Error('getRoomByCode GSI not implemented in this minimal scaffold. Use getRoom(id) or add a mapping item.');
}

async function listRooms(_ctx: Ctx) {
  // Minimal: not paginated; in production, use a GSI of rooms by creator or maintain a small catalog.
  return [];
}

// ========== PRESENCE ==========
async function setPresence(ctx: Ctx) {
  const { roomId, state, displayName } = ctx.arguments;
  const userId = userIdOf(ctx);
  const ts = nowIso();
  const item = {
    PK: `ROOM#${roomId}`, SK: `PRES#${userId}`,
    userId, displayName, role: 'MEMBER', state,
    lastSeen: ts,
    ttl: Math.floor(Date.now()/1000) + 90
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { userId, displayName, role: 'MEMBER', state, lastSeen: ts };
}

// ========== STORIES ==========
async function createStory(ctx: Ctx) {
  const { roomId, title, description, tags } = ctx.arguments;
  const id = randomUUID(); const ts = nowIso();
  const item = {
    PK: `ROOM#${roomId}`, SK: `STORY#${id}`,
    id, roomId, title, description, tags,
    status: 'todo',
    createdBy: userIdOf(ctx),
    createdAt: ts, updatedAt: ts,
    voteCount: 0, avgVote: null, revealed: false
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return toStory(item);
}

async function updateStory(ctx: Ctx) {
  const { roomId, storyId, title, description, status, tags } = ctx.arguments;
  const updates: string[] = []; const names: Record<string,string> = {}; const values: Record<string,any> = { ':u': nowIso() };
  if (title !== undefined) { updates.push('#t=:t'); names['#t']='title'; values[':t']=title; }
  if (description !== undefined) { updates.push('#d=:d'); names['#d']='description'; values[':d']=description; }
  if (status !== undefined) { updates.push('#s=:s'); names['#s']='status'; values[':s']=status; }
  if (tags !== undefined) { updates.push('#g=:g'); names['#g']='tags'; values[':g']=tags; }
  const res = await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `ROOM#${roomId}`, SK: `STORY#${storyId}` },
    UpdateExpression: 'SET ' + updates.concat('updatedAt=:u').join(', '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW'
  }));
  return toStory(res.Attributes!);
}

async function deleteStory(ctx: Ctx) {
  const { roomId, storyId } = ctx.arguments;
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `ROOM#${roomId}`, SK: `STORY#${storyId}` } }));
  return true;
}

async function getStory(ctx: Ctx) {
  const { roomId, storyId } = ctx.arguments;
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `ROOM#${roomId}`, SK: `STORY#${storyId}` } }));
  return res.Item ? toStory(res.Item) : null;
}

async function listStories(ctx: Ctx) {
  const { roomId, limit, nextToken } = ctx.arguments;
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK=:pk AND begins_with(SK,:sk)',
    ExpressionAttributeValues: { ':pk': `ROOM#${roomId}`, ':sk': 'STORY#' },
    Limit: limit ?? 50,
    ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken,'base64').toString('utf8')) : undefined
  }));
  return {
    items: (res.Items ?? []).map(toStory),
    nextToken: res.LastEvaluatedKey ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64') : null
  };
}

// ========== VOTES ==========
async function castVote(ctx: Ctx) {
  const { roomId, storyId, value } = ctx.arguments;
  const userId = userIdOf(ctx);
  const id = `${storyId}:${userId}`;
  const ts = nowIso();
  const item = {
    PK: `ROOM#${roomId}`, SK: `VOTE#${storyId}#${userId}`,
    id, roomId, storyId, userId, value, createdAt: ts,
    GSI1PK: `STORY#${storyId}`, GSI1SK: `USER#${userId}`
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function retractVote(ctx: Ctx) {
  const { roomId, storyId } = ctx.arguments;
  const userId = userIdOf(ctx);
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: `ROOM#${roomId}`, SK: `VOTE#${storyId}#${userId}` }
  }));
  return true;
}

async function revealVotes(ctx: Ctx) {
  const { roomId, storyId, reveal } = ctx.arguments;
  const res = await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `ROOM#${roomId}`, SK: `STORY#${storyId}` },
    UpdateExpression: 'SET revealed=:r, updatedAt=:u',
    ExpressionAttributeValues: { ':r': reveal, ':u': nowIso() },
    ReturnValues: 'ALL_NEW'
  }));
  return toStory(res.Attributes!);
}

// ========== RETRO ==========
async function addRetro(ctx: Ctx) {
  const { roomId, category, text } = ctx.arguments;
  const id = randomUUID(); const ts = nowIso();
  const item = {
    PK: `ROOM#${roomId}`, SK: `RETRO#${id}`,
    id, roomId, category, text,
    authorId: userIdOf(ctx), votes: 0,
    createdAt: ts
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function voteRetro(ctx: Ctx) {
  const { roomId, retroId, delta } = ctx.arguments;
  const res = await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `ROOM#${roomId}`, SK: `RETRO#${retroId}` },
    UpdateExpression: 'ADD votes :d',
    ExpressionAttributeValues: { ':d': delta },
    ReturnValues: 'ALL_NEW'
  }));
  return res.Attributes!;
}

async function listRetro(ctx: Ctx) {
  const { roomId, limit, nextToken } = ctx.arguments;
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK=:pk AND begins_with(SK,:sk)',
    ExpressionAttributeValues: { ':pk': `ROOM#${roomId}`, ':sk': 'RETRO#' },
    Limit: limit ?? 50,
    ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken,'base64').toString('utf8')) : undefined
  }));
  return {
    items: (res.Items ?? []),
    nextToken: res.LastEvaluatedKey ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64') : null
  };
}

// ---------- helpers ----------
function toRoom(i: any) { return i; }
function toStory(i: any) { return i; }
```

---

# 5) DynamoDB Streams tally processor

`infra/lambda/tally/index.ts`

```ts
import { DynamoDBStreamEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.TABLE_NAME!;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: DynamoDBStreamEvent) => {
  // Look for VOTE#storyId#userId inserts/updates/deletes and recompute the story's avg & count.
  for (const rec of event.Records) {
    const newItem = rec.dynamodb?.NewImage ? unmarshall(rec.dynamodb.NewImage) : undefined;
    const oldItem = rec.dynamodb?.OldImage ? unmarshall(rec.dynamodb.OldImage) : undefined;
    const sk = newItem?.SK || oldItem?.SK;
    if (!sk || !sk.startsWith('VOTE#')) continue;

    const [ , storyId ] = sk.split('#');
    const pk = (newItem?.PK || oldItem?.PK) as string; // ROOM#<id>
    const roomId = pk.split('#')[1];

    // recompute
    const votesRes = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK=:pk AND begins_with(SK,:sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': `VOTE#${storyId}` }
    }));
    const values = (votesRes.Items ?? []).map(v => parseFloat(v.value)).filter(v => !isNaN(v));
    const count = values.length;
    const avg = count ? (values.reduce((a,b)=>a+b,0) / count) : null;

    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: pk, SK: `STORY#${storyId}` },
      UpdateExpression: 'SET voteCount=:c, avgVote=:a',
      ExpressionAttributeValues: { ':c': count, ':a': avg }
    }));
  }
  return { ok: true };
};

// simple unmarshall for small payloads (avoid full @aws-sdk/util-dynamodb import)
function unmarshall(image: Record<string, any>) {
  const out: any = {};
  for (const [k,v] of Object.entries(image)) {
    const t = Object.keys(v as any)[0];
    const val = (v as any)[t];
    out[k] = t === 'N' ? Number(val) : val;
  }
  return out;
}
```

---

# 6) GitHub Actions CI

`.github/workflows/deploy-infra.yml`

```yaml
name: Deploy Infra

on:
  push:
    paths:
      - 'infra/**'
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    env:
      AWS_REGION: us-east-1
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install CDK & deps
        working-directory: infra
        run: |
          npm i -g aws-cdk
          npm ci

      - name: Configure AWS (OIDC or keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK synth & deploy
        working-directory: infra
        run: |
          npm run cdk:deploy
```

> Set `AWS_ROLE_TO_ASSUME` in repo secrets (or swap for access keys).

---

# 7) Kiroween `/.kiro` evidence (lean but meaningful)

## `/.kiro/specs/domain.yaml`

```yaml
version: 1
entities:
  Room:
    id: uuid
    name: string
    code: string
    stage: enum[PLANNING,VOTING,RETRO,CLOSED]
    sprint: string?
    createdBy: userId
    createdAt: datetime
    updatedAt: datetime
  Story:
    id: uuid
    roomId: uuid
    title: string
    description: string?
    status: string
    tags: string[]
    createdBy: userId
    createdAt: datetime
    updatedAt: datetime
    voteCount: int
    avgVote: number?
    revealed: boolean
  RetroNote:
    id: uuid
    roomId: uuid
    category: enum[START,STOP,CONTINUE,KUDOS,ISSUE]
    text: string
    authorId: userId
    createdAt: datetime
    votes: int
  Presence:
    roomId: uuid
    userId: userId
    displayName: string
    role: enum[MODERATOR,MEMBER,OBSERVER]
    state: enum[ONLINE,AWAY,OFFLINE]
    lastSeen: datetime
    ttl: int
slis:
  join_success_pct: ">= 99.5"
  pubsub_p95_ms: "<= 250"
  presence_freshness_s: "<= 30"
```

## `/.kiro/specs/flows.yaml`

```yaml
version: 1
flows:
  join_room:
    input: { roomCode: string, displayName: string }
    output: Member
    publishes: presence.heartbeat
  planning_create_story:
    input: { roomId: uuid, title: string, description?: string, tags?: string[] }
    publishes: story.created
  voting_cast_vote:
    input: { roomId: uuid, storyId: uuid, value: string }
    publishes: vote.cast
  retro_add_note:
    input: { roomId: uuid, category: RetroCategory, text: string }
    publishes: retro.added
```

## `/.kiro/specs/connectors.yaml`

```yaml
version: 1
connectors:
  domo:
    datasets:
      - name: room_kpis
        fields: [timestamp, roomId, metric, value]
    schedule: every_15_min
```

## `/.kiro/hooks/on_save_generate_tests.yaml`

```yaml
name: on_save_generate_tests
trigger: on_spec_change
run:
  - cmd: "npm test --workdir infra"
  - cmd: "npm run build --workdir infra"
```

## `/.kiro/hooks/nightly_room_slo_probe.yaml`

```yaml
name: nightly_room_slo_probe
trigger: cron(0 7 * * ? *)  # 07:00 UTC
run:
  - cmd: "node scripts/probe.js"  # (add later) publish & subscribe synthetic events, write metrics to Domo
```

## `/.kiro/steering/foundation.md`

```
Tone: supportive, efficient, clear. 
UX names: "Room", "Story", "Retro", "Vote".
Event names: story.created, vote.cast, retro.added, presence.heartbeat.
```

## `/.kiro/mcp/servers.json`

```json
{
  "servers": [
    { "id": "domo", "name": "Domo", "type": "http", "baseUrl": "https://api.domo.com", "auth": "env:DOMO_TOKEN" }
  ]
}
```

---

# 8) How to deploy & test

1. **Bootstrap & deploy**

```bash
cd scrum-web-app/infra
npm ci
npm run cdk:deploy
# capture outputs: GraphqlUrl, UserPoolId, UserPoolClientId
```

2. **Create a user** in Cognito (for quick testing):

```bash
aws cognito-idp sign-up \
  --client-id <UserPoolClientId> \
  --username you@example.com --password 'TempPassw0rd!'
# then confirm in Console or via AdminConfirmSignUp
```

3. **Try a mutation** (e.g., create a room) with an **ID token** in your GraphQL client:

```graphql
mutation {
  createRoom(name:"Sprint 42", code:"FALCON", sprint:"2025-11") {
    id name code stage createdAt
  }
}
```

4. **Subscribe** to `onRoomEvent(roomId:"<id>")` and try `createStory`, `castVote`, `addRetroNote` to see live updates.

---

## Notes / TODOs you might add later

* Implement a **Room Code → Room ID** mapping item to support `getRoomByCode` without scans (e.g., write `PK=ROOM_CODE#code, SK=ROOM#id` on `createRoom` and query it).
* Add **rate limits** on hot mutations (e.g., `castVote`) using tiny in-memory token bucket (API key) or per-user counters in Dynamo with conditional writes.
* Add **Domo ETL** Lambda (batch metrics → dataset) once you finalize your cards.
* Frontend: create a single **room subscription** hook (`onRoomEvent`) with client-side reducer; optionally also bind to fine-grained channels.

---

If you want me to tailor this for **API Gateway WebSockets** instead of AppSync (or to flesh out the Domo ETL Lambda), say the word and I’ll swap in that variant.
