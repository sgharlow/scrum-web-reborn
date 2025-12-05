# Requirements Document

## Introduction

This document defines the requirements for migrating the Scrum Reborn application from a peer-to-peer (P2P) WebRTC architecture to a serverless AWS AppSync + DynamoDB architecture. The migration aims to improve connectivity from 50% to 99.5%+ by eliminating NAT traversal issues and providing guaranteed message delivery through managed AWS services.

## Glossary

- **AppSync**: AWS managed GraphQL service that provides real-time subscriptions via WebSockets
- **DynamoDB**: AWS NoSQL database service with single-table design pattern
- **CDK**: AWS Cloud Development Kit for infrastructure as code
- **Lambda Resolver**: AWS Lambda function that handles GraphQL mutations and queries
- **Tally Processor**: Lambda function triggered by DynamoDB Streams to compute vote aggregates
- **Cognito**: AWS authentication service for user management
- **SLI**: Service Level Indicator - measurable metric for service quality
- **P2P**: Peer-to-peer networking using WebRTC
- **NAT**: Network Address Translation that can block P2P connections

## Requirements

### Requirement 1: Infrastructure Foundation

**User Story:** As a developer, I want to deploy AWS infrastructure using CDK, so that I can provision AppSync, DynamoDB, Cognito, and Lambda resources in a repeatable way

#### Acceptance Criteria

1. WHEN the CDK stack is deployed, THE Infrastructure SHALL create an AppSync GraphQL API with user pool authentication
2. WHEN the CDK stack is deployed, THE Infrastructure SHALL create a DynamoDB table with single-table design supporting PK, SK, and GSI1
3. WHEN the CDK stack is deployed, THE Infrastructure SHALL create a Cognito User Pool with email sign-in enabled
4. WHEN the CDK stack is deployed, THE Infrastructure SHALL output the GraphQL URL, User Pool ID, and Client ID for frontend configuration
5. WHEN the infrastructure is destroyed, THE Infrastructure SHALL remove all resources without leaving orphaned data

### Requirement 2: GraphQL Schema Definition

**User Story:** As a developer, I want a complete GraphQL schema, so that clients can perform mutations, queries, and subscriptions for all room operations

#### Acceptance Criteria

1. THE GraphQL_Schema SHALL define mutations for createRoom, joinRoom, createStory, castVote, revealVotes, and addRetroNote
2. THE GraphQL_Schema SHALL define queries for getRoom, getRoomByCode, listStories, and listRetro
3. THE GraphQL_Schema SHALL define subscriptions for onRoomEvent, onStoryChanged, onVoteChanged, and onPresenceChanged
4. WHEN a mutation executes, THE GraphQL_Schema SHALL trigger corresponding subscription events to all subscribers
5. THE GraphQL_Schema SHALL use scalar types AWSDateTime and AWSJSON for proper data serialization

### Requirement 3: Lambda Mutation Resolvers

**User Story:** As a user, I want to create rooms and join them with a code, so that I can collaborate with my team in real-time

#### Acceptance Criteria

1. WHEN createRoom is called with name and code, THE Mutations_Lambda SHALL create a room record in DynamoDB with unique ID and write GSI1 mapping for code lookup
2. WHEN createRoom is called with a code, THE Mutations_Lambda SHALL validate the code is exactly 6 uppercase alphanumeric characters
3. WHEN joinRoom is called with a room code, THE Mutations_Lambda SHALL lookup the room via GSI1 and create a presence record with 300-second TTL
4. WHEN castVote is called, THE Mutations_Lambda SHALL validate the vote value is in the allowed set and upsert a vote record with composite key VOTE#storyId#userId
5. WHEN revealVotes is called, THE Mutations_Lambda SHALL verify the user has MODERATOR role before setting the story revealed flag to true
6. WHEN listRooms is called, THE Mutations_Lambda SHALL query rooms created by the authenticated user using GSI1
7. IF a room code already exists, THEN THE Mutations_Lambda SHALL return an error message suggesting an alternative code

### Requirement 4: Vote Tally Processing

**User Story:** As a user, I want to see vote counts and averages update automatically, so that I can make informed estimation decisions

#### Acceptance Criteria

1. WHEN a vote is cast, THE Tally_Processor SHALL receive a DynamoDB Stream event within 1 second
2. WHEN the Tally_Processor receives a vote event, THE Tally_Processor SHALL query all votes for that story with pagination limit of 100
3. WHEN computing aggregates, THE Tally_Processor SHALL calculate voteCount as total votes and avgVote excluding special cards (☕, ❓)
4. WHEN aggregates are computed, THE Tally_Processor SHALL update the story record with new voteCount and avgVote values using idempotent recomputation
5. THE Tally_Processor SHALL complete processing within 2 seconds at the 95th percentile
6. THE Tally_Processor SHALL use a Dead Letter Queue for failed batches after 3 retry attempts
7. THE Tally_Processor SHALL properly unmarshall all DynamoDB attribute types including String, Number, List, Map, Boolean, and Null

### Requirement 5: Authentication and Authorization

**User Story:** As a user, I want to sign up and sign in securely, so that my identity is verified and my data is protected

#### Acceptance Criteria

1. WHEN a user signs up, THE Cognito_Service SHALL require a password with minimum 8 characters and at least one digit
2. WHEN a user signs in, THE Cognito_Service SHALL return a JWT token valid for 1 hour
3. WHEN a GraphQL request is made, THE AppSync_API SHALL validate the JWT token before invoking resolvers
4. WHEN a moderator-only action is attempted, THE Lambda_Resolver SHALL verify the user's role claim matches MODERATOR
5. IF authentication fails, THEN THE AppSync_API SHALL return a 401 Unauthorized error

### Requirement 6: Real-Time Subscriptions

**User Story:** As a user, I want to see updates from other participants instantly, so that I can collaborate effectively without refreshing

#### Acceptance Criteria

1. WHEN a client subscribes to onRoomEvent, THE AppSync_API SHALL establish a WebSocket connection over HTTPS with automatic reconnection enabled
2. WHEN a mutation completes, THE AppSync_API SHALL publish subscription events to all connected subscribers within 250ms at the 95th percentile
3. WHEN a client temporarily disconnects, THE AppSync_API SHALL buffer events and deliver them upon reconnection
4. WHEN a presence heartbeat is sent every 30 seconds by the frontend, THE AppSync_API SHALL update the lastSeen timestamp and refresh TTL to 300 seconds
5. THE AppSync_API SHALL maintain 99.5% or higher connectivity success rate
6. THE Frontend SHALL implement a 30-second interval timer to send presence heartbeats while the user is active in a room

### Requirement 7: Data Model and Access Patterns

**User Story:** As a developer, I want efficient data access patterns, so that queries and mutations perform well at scale

#### Acceptance Criteria

1. THE DynamoDB_Table SHALL use PK=ROOM#id and SK for entity type discrimination (ROOM#id, STORY#id, VOTE#storyId#userId)
2. THE DynamoDB_Table SHALL support querying all stories in a room using PK=ROOM#id and SK begins_with STORY#
3. THE DynamoDB_Table SHALL support querying all votes for a story using PK=ROOM#id and SK begins_with VOTE#storyId# with pagination limit of 100
4. THE DynamoDB_Table SHALL use GSI1 with GSI1PK=ROOM_CODE#code for room code lookups and GSI1PK=USER#userId for user's rooms
5. THE DynamoDB_Table SHALL enable TTL on presence records to auto-delete stale entries after 300 seconds
6. WHEN createRoom writes a room record, THE Mutations_Lambda SHALL also write GSI1PK and GSI1SK attributes for code and user lookups

### Requirement 8: Monitoring and Observability

**User Story:** As an operator, I want to monitor SLIs and receive alerts, so that I can ensure the service meets reliability targets

#### Acceptance Criteria

1. WHEN Lambda resolvers execute, THE Monitoring_System SHALL emit custom CloudWatch metrics for success, failure, and latency
2. WHEN SLI metrics are collected, THE Monitoring_System SHALL track connectivity success rate, pub/sub latency, and vote tally latency
3. WHEN an SLI breaches its target, THE Monitoring_System SHALL trigger a CloudWatch alarm
4. THE Monitoring_System SHALL provide a nightly synthetic probe that executes a full room flow and measures end-to-end latency
5. IF the nightly probe fails, THEN THE Monitoring_System SHALL send an alert to the configured Slack channel

### Requirement 9: Deployment Automation

**User Story:** As a developer, I want automated deployment via CI/CD, so that infrastructure changes are tested and deployed consistently

#### Acceptance Criteria

1. WHEN code is pushed to the infra directory, THE CI_Pipeline SHALL trigger a GitHub Actions workflow
2. WHEN the workflow runs, THE CI_Pipeline SHALL install dependencies, build Lambda bundles, and synthesize the CDK stack
3. WHEN CDK synth succeeds, THE CI_Pipeline SHALL deploy the stack to AWS using configured credentials
4. WHEN deployment completes, THE CI_Pipeline SHALL output the GraphQL URL and Cognito configuration
5. IF deployment fails, THEN THE CI_Pipeline SHALL report the error and prevent partial deployments

### Requirement 10: Frontend Integration

**User Story:** As a developer, I want to replace PeerJS with AWS Amplify, so that the frontend uses AppSync for real-time collaboration

#### Acceptance Criteria

1. THE Frontend SHALL install AWS Amplify libraries for GraphQL and authentication
2. THE Frontend SHALL configure Amplify with the GraphQL endpoint and Cognito User Pool from CDK outputs
3. THE Frontend SHALL replace the useCollaboration hook with useGraphQL and useSubscription hooks
4. WHEN a user performs an action, THE Frontend SHALL dispatch optimistic updates and call GraphQL mutations
5. IF a mutation fails, THEN THE Frontend SHALL rollback the optimistic update and display an error message
