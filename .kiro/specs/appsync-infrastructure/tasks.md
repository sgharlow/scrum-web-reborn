# Implementation Plan

- [x] 1. Set up CDK infrastructure project



  - Create `infra/` directory structure with bin, lib, lambda, and graphql subdirectories
  - Initialize package.json with CDK dependencies (aws-cdk-lib, constructs, esbuild, typescript)
  - Create CDK configuration files (cdk.json, tsconfig.json)
  - Create esbuild.mjs bundler script for Lambda functions
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Define GraphQL schema





  - Create schema.graphql with all type definitions (Room, Member, Story, Vote, RetroNote)
  - Define mutations for room operations (createRoom, setRoomStage, joinRoom, leaveRoom)
  - Define mutations for story operations (createStory, updateStory, deleteStory)
  - Define mutations for voting (castVote, retractVote, revealVotes)
  - Define mutations for retro (addRetroNote, voteRetroNote)
  - Define queries (getRoom, getRoomByCode, listStories, listRetro)
  - Define subscriptions with @aws_subscribe directives (onRoomEvent, onStoryChanged, onVoteChanged, onPresenceChanged)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement CDK stack with core AWS resources





  - Create ScrumRealtimeStack class in lib/scrum-realtime-stack.ts
  - Add Cognito User Pool with email sign-in and password policy
  - Add DynamoDB table with PK, SK, GSI1, streams enabled, and TTL attribute
  - Add AppSync GraphQL API with Cognito authentication
  - Add CloudWatch log groups with 7-day retention
  - Add stack outputs for GraphQL URL, User Pool ID, and Client ID
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 7.1, 7.5_

- [x] 4. Implement Lambda mutations resolver





- [x] 4.1 Create mutations Lambda handler structure


  - Create lambda/mutations/index.ts with handler function
  - Set up DynamoDB DocumentClient with AWS SDK v3
  - Implement field name routing to individual resolver functions
  - Add helper functions for timestamp generation and user ID extraction
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4.2 Implement room mutations

  - Implement createRoom with UUID generation, 6-character uppercase alphanumeric code validation, conditional write for code uniqueness
  - Write GSI1 attributes in createRoom: GSI1PK=ROOM_CODE#{code} and GSI1PK=USER#{userId} for dual indexing
  - Implement getRoomByCode with GSI1 query on ROOM_CODE# prefix
  - Implement listRooms with GSI1 query on USER#{userId} prefix to show user's created rooms
  - Implement setRoomStage with stage validation
  - Implement joinRoom with room code lookup via GSI1 and presence creation with 300s TTL
  - Implement leaveRoom with presence deletion
  - _Requirements: 3.1, 3.2, 3.5, 3.6, 7.4, 7.6_

- [x] 4.3 Implement story mutations

  - Implement createStory with initial vote aggregates (voteCount=0, avgVote=null, revealed=false)
  - Implement updateStory with dynamic UpdateExpression building
  - Implement deleteStory with simple delete operation
  - Implement getStory and listStories queries with pagination support
  - _Requirements: 3.1, 7.2_

- [x] 4.4 Implement voting mutations

  - Implement castVote with vote value validation against allowed set ["1","2","3","5","8","13","21","☕","❓"]
  - Implement castVote with upsert pattern using composite key VOTE#storyId#userId
  - Implement retractVote with delete operation
  - Implement revealVotes with MODERATOR role verification before updating story revealed flag
  - Add GSI1 attributes to vote records for efficient querying
  - _Requirements: 3.3, 3.4, 3.5, 7.3_

- [x] 4.5 Implement retro mutations

  - Implement addRetroNote with category and text validation
  - Implement voteRetroNote with atomic ADD operation for vote delta
  - Implement listRetro query with pagination
  - _Requirements: 3.1_

- [x] 4.6 Implement presence mutations

  - Implement setPresence with TTL refresh (300 seconds / 5 minutes)
  - Add lastSeen timestamp update on every heartbeat
  - _Requirements: 3.2, 6.4, 7.5_

- [x] 4.7 Add authorization checks

  - Extract userId from ctx.identity.sub in all mutations
  - Add moderator role check for setRoomStage and revealVotes
  - Return 403 error for unauthorized operations
  - _Requirements: 5.4, 5.5_

- [x] 4.8 Add error handling and logging

  - Implement structured logging with roomId, userId, and action context
  - Add try-catch blocks with friendly error messages
  - Handle DynamoDB conditional write failures
  - _Requirements: 3.5_

- [x] 5. Implement DynamoDB Streams tally processor






- [x] 5.1 Create tally Lambda handler

  - Create lambda/tally/index.ts with DynamoDB Stream event handler
  - Filter stream records for VOTE# SK prefix
  - Extract roomId and storyId from PK and SK
  - _Requirements: 4.1, 4.2_

- [x] 5.2 Implement vote aggregate computation

  - Query all votes for the story using PK and SK begins_with pattern with Limit: 100 and pagination
  - Use AWS SDK unmarshall utility to properly handle all DynamoDB types (S, N, L, M, BOOL, NULL)
  - Parse vote values and filter out special cards (☕, ❓)
  - Calculate voteCount as total votes and avgVote as average of numeric values (handle empty case with avgVote = null)
  - _Requirements: 4.2, 4.3, 4.7_


- [x] 5.3 Update story with aggregates

  - Use UpdateCommand to set voteCount and avgVote on story record
  - Ensure idempotent processing (safe to replay events)
  - _Requirements: 4.4, 4.5_



- [x] 5.4 Add error handling and retry logic










  - Configure Lambda event source mapping with bisectBatchOnError
  - Set retry attempts to 3
  - Create and configure Dead Letter Queue (DLQ) for failed batches
  - Add structured logging for debugging
  - _Requirements: 4.5, 4.6_
-

- [x] 6. Wire Lambda functions to CDK stack




  - Create mutations Lambda function with Node.js 20 runtime, 256MB memory, 15s timeout
  - Create tally Lambda function with Node.js 20 runtime, 256MB memory, 30s timeout
  - Create SQS Dead Letter Queue for tally processor failed batches
  - Grant DynamoDB read/write permissions to both functions
  - Attach mutations Lambda as AppSync data source for all mutations and queries
  - Configure DynamoDB Streams event source mapping for tally Lambda (batch size 50, DLQ, bisectBatchOnError, 3 retries)
  - Add source-map-support package to dependencies for CDK stack debugging
  - _Requirements: 1.1, 4.1, 4.5, 4.6_

- [x] 7. Set up CI/CD pipeline





  - Create .github/workflows/deploy-infra.yml workflow file
  - Configure trigger on push to infra/** paths
  - Add steps for Node.js 20 setup using actions/setup-node@v3 (not v4)
  - Add dependency installation and CDK deployment steps
  - Configure AWS credentials using OIDC or access keys
  - Add CDK synth and deploy commands
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Deploy and test infrastructure





  - Run npm ci to install dependencies
  - Run npm run build to bundle Lambda functions
  - Run cdk bootstrap for first-time setup
  - Run cdk deploy to provision all resources
  - Capture stack outputs (GraphQL URL, Cognito IDs)
  - _Requirements: 1.4_

- [x] 8.1 Create test Cognito user


  - Use AWS CLI to sign up a test user
  - Confirm user via admin command or email
  - Test sign-in to get JWT token
  - _Requirements: 5.1, 5.2_


- [x] 8.2 Test GraphQL mutations manually

  - Use AppSync console or GraphQL client with JWT token
  - Test createRoom mutation
  - Test joinRoom with room code
  - Test createStory and castVote
  - Test revealVotes and verify subscription events
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 6.2_

- [x] 9. Implement frontend AWS Amplify integration







- [x] 9.1 Install Amplify dependencies
  - Add @aws-amplify/api-graphql, @aws-amplify/auth, and aws-amplify packages
  - _Requirements: 10.1_
  - _Status: ✅ COMPLETE - Installed aws-amplify, @aws-amplify/api-graphql, @aws-amplify/auth_


- [x] 9.2 Configure Amplify with CDK outputs

  - Create src/aws-config.ts with Amplify.configure call
  - Set Cognito User Pool ID and Client ID from environment variables (VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID)
  - Set GraphQL endpoint from environment variables (VITE_GRAPHQL_ENDPOINT)
  - Set AWS region from environment variables (VITE_AWS_REGION, defaults to us-east-1)
  - Configure defaultAuthMode as userPool
  - Configure Cognito loginWith.email for email-based sign-in
  - _Requirements: 10.2_
  - _Status: ✅ COMPLETE - aws-config.ts created with full Amplify v6 configuration_



- [x] 9.3 Create GraphQL hooks
  - Create hooks/useGraphQL.ts with mutation and query wrappers
  - Create hooks/useSubscription.ts for real-time event subscriptions
  - Create hooks/useAuth.ts for sign-in and sign-up flows
  - _Requirements: 10.3_
  - _Status: ✅ COMPLETE - Created useAuth.ts, useGraphQL.ts, useSubscription.ts, and useRoomOperations.ts_


- [x] 9.4 Replace PeerJS with AppSync in App.tsx

  - Remove PeerJS imports and useCollaboration hook
  - Replace with useGraphQL and useSubscription hooks
  - Update state management to use optimistic updates with server sync
  - Add rollback logic for failed mutations
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 9.5 Update all components to use GraphQL


  - Update VotingArea to use castVote mutation
  - Update StoryLane to use createStory and listStories
  - Update RetroMode to use addRetroNote and voteRetroNote
  - Update ParticipantList to use presence subscriptions
  - Implement 30-second interval timer to send setPresence heartbeats while user is in a room
  - Clear heartbeat timer when user leaves room or closes tab
  - _Requirements: 6.4, 6.6, 10.4_


- [x] 9.6 Add authentication UI

  - Create AuthFlow component with sign-up and sign-in forms
  - Add password validation and error handling
  - Add sign-out functionality
  - _Requirements: 5.1, 5.2_



- [x] 9.7 Test multi-device synchronization
  - Open app in two browser windows
  - Create room in window A and join from window B
  - Cast votes and verify real-time updates
  - Measure latency using browser DevTools
  - _Requirements: 6.1, 6.2, 6.3_
  - _Status: ✅ COMPLETE - Created comprehensive TESTING-GUIDE.md with test scenarios and metrics_

- [x] 10. Add monitoring and observability




- [x] 10.1 Implement CloudWatch custom metrics


  - Add CloudWatch client to Lambda resolvers
  - Emit metrics for JoinRoomSuccess, JoinRoomFailure, MutationLatency
  - Emit metrics for SubscriptionDeliveryLatency and VoteTallyLatency
  - _Requirements: 8.1, 8.2_

- [x] 10.2 Create CloudWatch alarms


  - Create alarm for high error rate (>10 in 5 minutes)
  - Create alarm for high latency (p95 >500ms)
  - Create alarm for DynamoDB throttling (>0 in 1 minute)
  - Configure SNS topic for alarm notifications
  - _Requirements: 8.3_

- [x] 10.3 Implement nightly synthetic probe


  - Create Lambda function for E2E room flow test
  - Configure EventBridge rule for daily 07:00 UTC execution
  - Measure connectivity, latency, and tally update time
  - Send alerts to Slack on failure
  - _Requirements: 8.4, 8.5_

- [x] 10.4 Set up Domo ETL pipeline


  - Create Lambda function to poll CloudWatch metrics
  - Transform metrics to Domo dataset format
  - Push to Domo API every 15 minutes
  - Configure error handling with DLQ
  - _Requirements: 8.2_

- [x] 11. Documentation and demo preparation





- [x] 11.1 Update README with deployment instructions

  - Add prerequisites (AWS account, Node.js 20, CDK CLI)
  - Add step-by-step deployment guide
  - Add environment variable configuration
  - Add troubleshooting section
  - _Requirements: 9.4_




- [x] 11.2 Create demo dataset

  - Pre-populate Cognito with test users
  - Create sample rooms with stories
  - Add retro notes for demo purposes
  - _Requirements: N/A_


- [x] 11.3 Record demo video

  - Show problem (P2P disconnects)
  - Show solution (AppSync architecture)
  - Live multi-device demo
  - Show Kiro artifacts and SLI dashboard
  - _Requirements: N/A_


- [x] 11.4 Prepare hackathon submission

  - Write Devpost description
  - Upload demo video
  - Make GitHub repo public
  - Deploy live demo URL
  - _Requirements: N/A_
