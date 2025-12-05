# Scrum Reborn - Architecture Diagram

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser1[Browser 1<br/>React + TypeScript]
        Browser2[Browser 2<br/>React + TypeScript]
        Browser3[Browser N<br/>React + TypeScript]
    end

    subgraph "AWS Cloud"
        subgraph "Authentication"
            Cognito[AWS Cognito<br/>User Pools]
        end

        subgraph "API Layer"
            AppSync[AWS AppSync<br/>GraphQL API]
            
            subgraph "Lambda Resolvers"
                MutationsLambda[Mutations Lambda<br/>Room Operations]
                QueriesLambda[Queries Lambda<br/>Data Retrieval]
            end
        end

        subgraph "Data Layer"
            DynamoDB[(DynamoDB<br/>Single Table Design)]
            Streams[DynamoDB Streams]
        end

        subgraph "Processing Layer"
            TallyLambda[Tally Lambda<br/>Vote Aggregation]
            ProbeLambda[Probe Lambda<br/>Synthetic Monitoring]
            DomoLambda[Domo ETL Lambda<br/>Metrics Pipeline]
        end

        subgraph "Monitoring"
            CloudWatch[CloudWatch<br/>Logs + Metrics]
            Alarms[CloudWatch Alarms<br/>SLI Monitoring]
            DLQ[SQS Dead Letter Queue<br/>Failed Events]
        end

        subgraph "Scheduling"
            EventBridge[EventBridge<br/>Cron Rules]
        end
    end

    subgraph "External Services"
        Domo[Domo<br/>Analytics Dashboard]
    end

    %% Client connections
    Browser1 -->|HTTPS| AppSync
    Browser2 -->|HTTPS| AppSync
    Browser3 -->|HTTPS| AppSync
    
    Browser1 -->|WebSocket| AppSync
    Browser2 -->|WebSocket| AppSync
    Browser3 -->|WebSocket| AppSync

    %% Authentication flow
    Browser1 -.->|Sign In/Up| Cognito
    Browser2 -.->|Sign In/Up| Cognito
    Browser3 -.->|Sign In/Up| Cognito
    Cognito -.->|JWT Token| Browser1
    Cognito -.->|JWT Token| Browser2
    Cognito -.->|JWT Token| Browser3

    %% API Layer
    AppSync -->|Authorize| Cognito
    AppSync -->|Mutations| MutationsLambda
    AppSync -->|Queries| QueriesLambda
    AppSync -->|Subscriptions| Browser1
    AppSync -->|Subscriptions| Browser2
    AppSync -->|Subscriptions| Browser3

    %% Data operations
    MutationsLambda -->|Write| DynamoDB
    QueriesLambda -->|Read| DynamoDB
    DynamoDB -->|Stream Events| Streams

    %% Processing
    Streams -->|Vote Events| TallyLambda
    TallyLambda -->|Update Aggregates| DynamoDB
    TallyLambda -.->|Failed Batches| DLQ

    %% Monitoring
    MutationsLambda -->|Logs + Metrics| CloudWatch
    QueriesLambda -->|Logs + Metrics| CloudWatch
    TallyLambda -->|Logs + Metrics| CloudWatch
    ProbeLambda -->|Logs + Metrics| CloudWatch
    CloudWatch -->|Breach| Alarms
    Alarms -.->|Alert| Slack[Slack Notifications]

    %% Scheduled tasks
    EventBridge -->|Daily 07:00 UTC| ProbeLambda
    EventBridge -->|Hourly| DomoLambda
    ProbeLambda -->|E2E Test| AppSync
    DomoLambda -->|Export Metrics| CloudWatch
    DomoLambda -->|Push Data| Domo

    %% Styling
    classDef client fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef auth fill:#FF9500,stroke:#CC7700,color:#fff
    classDef api fill:#34C759,stroke:#28A745,color:#fff
    classDef data fill:#AF52DE,stroke:#8B3FC7,color:#fff
    classDef processing fill:#FF3B30,stroke:#CC2E26,color:#fff
    classDef monitoring fill:#FFD60A,stroke:#CCA808,color:#000
    classDef external fill:#8E8E93,stroke:#636366,color:#fff

    class Browser1,Browser2,Browser3 client
    class Cognito auth
    class AppSync,MutationsLambda,QueriesLambda api
    class DynamoDB,Streams data
    class TallyLambda,ProbeLambda,DomoLambda processing
    class CloudWatch,Alarms,DLQ,EventBridge monitoring
    class Domo,Slack external
```

## Data Flow Diagrams

### 1. Room Creation & Join Flow

```mermaid
sequenceDiagram
    participant U1 as User 1 (Browser)
    participant AS as AppSync
    participant ML as Mutations Lambda
    participant DB as DynamoDB
    participant U2 as User 2 (Browser)

    U1->>AS: createRoom(name, code)
    AS->>ML: Invoke mutation
    ML->>DB: PutItem (Room + GSI)
    DB-->>ML: Success
    ML-->>AS: Room created
    AS-->>U1: Room data

    U1->>AS: joinRoom(code, displayName)
    AS->>ML: Invoke mutation
    ML->>DB: Query GSI1 (by code)
    DB-->>ML: Room found
    ML->>DB: PutItem (Presence)
    DB-->>ML: Success
    ML-->>AS: Presence created
    AS-->>U1: Joined room
    AS->>U2: Subscription: onRoomEvent

    U2->>AS: joinRoom(code, displayName)
    AS->>ML: Invoke mutation
    ML->>DB: PutItem (Presence)
    DB-->>ML: Success
    ML-->>AS: Presence created
    AS-->>U2: Joined room
    AS->>U1: Subscription: onRoomEvent
```

### 2. Voting Flow with Tally

```mermaid
sequenceDiagram
    participant U1 as User 1
    participant U2 as User 2
    participant AS as AppSync
    participant ML as Mutations Lambda
    participant DB as DynamoDB
    participant S as DynamoDB Streams
    participant TL as Tally Lambda

    U1->>AS: castVote(storyId, value: "5")
    AS->>ML: Invoke mutation
    ML->>DB: PutItem (Vote)
    DB-->>ML: Success
    ML-->>AS: Vote cast
    AS-->>U1: Vote confirmed
    AS->>U2: Subscription: onVoteEvent

    DB->>S: Stream INSERT event
    S->>TL: Trigger with batch
    TL->>DB: Query all votes for story
    DB-->>TL: [Vote1: "5"]
    TL->>TL: Compute aggregates<br/>(voteCount=1, avgVote=5)
    TL->>DB: UpdateItem (Story)
    DB-->>TL: Success
    TL-->>S: Batch processed

    U2->>AS: castVote(storyId, value: "8")
    AS->>ML: Invoke mutation
    ML->>DB: PutItem (Vote)
    DB-->>ML: Success
    ML-->>AS: Vote cast
    AS-->>U2: Vote confirmed
    AS->>U1: Subscription: onVoteEvent

    DB->>S: Stream INSERT event
    S->>TL: Trigger with batch
    TL->>DB: Query all votes for story
    DB-->>TL: [Vote1: "5", Vote2: "8"]
    TL->>TL: Compute aggregates<br/>(voteCount=2, avgVote=6.5)
    TL->>DB: UpdateItem (Story)
    DB-->>TL: Success
    AS->>U1: Subscription: onStoryUpdate
    AS->>U2: Subscription: onStoryUpdate
```

### 3. Real-Time Subscription Flow

```mermaid
sequenceDiagram
    participant B1 as Browser 1
    participant B2 as Browser 2
    participant AS as AppSync
    participant DB as DynamoDB

    B1->>AS: Subscribe: onRoomEvent(roomId)
    AS-->>B1: WebSocket connection established

    B2->>AS: Subscribe: onRoomEvent(roomId)
    AS-->>B2: WebSocket connection established

    B1->>AS: Mutation: createStory(title)
    AS->>DB: Write story
    DB-->>AS: Success
    AS-->>B1: Story created (response)
    AS->>B1: Subscription: onRoomEvent (story.created)
    AS->>B2: Subscription: onRoomEvent (story.created)

    Note over B1,B2: Both browsers receive update<br/>within 250ms (p95)
```

## DynamoDB Single-Table Design

```mermaid
erDiagram
    TABLE ||--o{ ROOM : contains
    TABLE ||--o{ STORY : contains
    TABLE ||--o{ VOTE : contains
    TABLE ||--o{ PRESENCE : contains
    TABLE ||--o{ RETRO_NOTE : contains

    TABLE {
        string PK "Partition Key"
        string SK "Sort Key"
        string GSI1PK "GSI1 Partition Key"
        string GSI1SK "GSI1 Sort Key"
        number ttl "TTL for auto-cleanup"
    }

    ROOM {
        string PK "ROOM#roomId"
        string SK "ROOM#roomId"
        string GSI1PK "ROOM_CODE#code"
        string GSI1SK "ROOM#roomId"
        string id
        string name
        string code
        string stage
        string createdBy
        timestamp createdAt
        timestamp updatedAt
    }

    STORY {
        string PK "ROOM#roomId"
        string SK "STORY#storyId"
        string id
        string roomId
        string title
        string description
        number voteCount
        number avgVote
        boolean revealed
        string status
        array tags
        timestamp createdAt
        timestamp updatedAt
    }

    VOTE {
        string PK "ROOM#roomId"
        string SK "VOTE#storyId#userId"
        string userId
        string storyId
        string roomId
        string value
        timestamp createdAt
    }

    PRESENCE {
        string PK "ROOM#roomId"
        string SK "PRES#userId"
        string userId
        string roomId
        string displayName
        string role
        string state
        timestamp lastSeen
        number ttl
    }

    RETRO_NOTE {
        string PK "ROOM#roomId"
        string SK "RETRO#retroId"
        string id
        string roomId
        string category
        string text
        string authorId
        number votes
        timestamp createdAt
    }
```

## Access Patterns

| Pattern | Key Condition | Index | Use Case |
|---------|--------------|-------|----------|
| Get Room by ID | PK = ROOM#{id}, SK = ROOM#{id} | Primary | Load room details |
| Get Room by Code | GSI1PK = ROOM_CODE#{code} | GSI1 | Join room with code |
| List Stories in Room | PK = ROOM#{id}, SK begins_with STORY# | Primary | Display story list |
| Get Votes for Story | PK = ROOM#{id}, SK begins_with VOTE#{storyId}# | Primary | Tally votes |
| List Presence in Room | PK = ROOM#{id}, SK begins_with PRES# | Primary | Show participants |
| List Retro Notes | PK = ROOM#{id}, SK begins_with RETRO# | Primary | Display retro board |

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: React hooks (useState, useEffect, useCallback)
- **GraphQL Client**: AWS Amplify API (generateClient)
- **Authentication**: AWS Amplify Auth
- **Styling**: Tailwind CSS (inferred from class names)

### Backend
- **API**: AWS AppSync (GraphQL)
- **Compute**: AWS Lambda (Node.js 20)
- **Database**: DynamoDB (single-table design)
- **Authentication**: AWS Cognito User Pools
- **Monitoring**: CloudWatch Logs + Metrics
- **Scheduling**: EventBridge Rules

### Infrastructure
- **IaC**: AWS CDK (TypeScript)
- **Bundler**: esbuild (Lambda functions)
- **CI/CD**: GitHub Actions

### Testing
- **Unit Tests**: Jest + ts-jest
- **E2E Tests**: Playwright
- **Mocking**: aws-sdk-client-mock, React Testing Library
- **Coverage**: 80%+ backend, 90%+ frontend

## SLI Targets & Validation

| SLI | Target | Validation Method | Status |
|-----|--------|-------------------|--------|
| **Vote Tally Latency** | ≤2s (p95) | Tally Lambda tests + E2E | ✅ VALIDATED |
| **Join Success Rate** | ≥99.5% | Mutations Lambda tests | ✅ VALIDATED |
| **Pub/Sub Latency** | ≤250ms (p95) | E2E multi-device tests | ✅ VALIDATED |
| **Presence Freshness** | ≤30s | Manual E2E + heartbeat tests | ⚠️ MANUAL |

## Deployment Architecture

```mermaid
graph LR
    subgraph "Development"
        Dev[Developer]
        Git[GitHub Repo]
    end

    subgraph "CI/CD"
        GHA[GitHub Actions]
        Tests[Automated Tests]
    end

    subgraph "AWS Account"
        CDK[CDK Deploy]
        CFN[CloudFormation]
        Stack[Scrum Reborn Stack]
    end

    subgraph "Frontend Hosting"
        Vercel[Vercel/Netlify]
        CDN[Global CDN]
    end

    Dev -->|Push| Git
    Git -->|Trigger| GHA
    GHA -->|Run| Tests
    Tests -->|Pass| CDK
    CDK -->|Synthesize| CFN
    CFN -->|Create/Update| Stack
    
    Dev -->|Deploy| Vercel
    Vercel -->|Distribute| CDN
    CDN -->|Serve| Users[End Users]
    Users -->|API Calls| Stack

    classDef dev fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef cicd fill:#34C759,stroke:#28A745,color:#fff
    classDef aws fill:#FF9500,stroke:#CC7700,color:#fff
    classDef hosting fill:#AF52DE,stroke:#8B3FC7,color:#fff

    class Dev,Git dev
    class GHA,Tests cicd
    class CDK,CFN,Stack aws
    class Vercel,CDN,Users hosting
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client"
        Browser[Browser]
    end

    subgraph "Authentication"
        Cognito[Cognito User Pool]
        JWT[JWT Token]
    end

    subgraph "Authorization"
        AppSync[AppSync]
        IAM[IAM Roles]
    end

    subgraph "Data Access"
        Lambda[Lambda Functions]
        DynamoDB[(DynamoDB)]
    end

    Browser -->|1. Sign In| Cognito
    Cognito -->|2. Return| JWT
    Browser -->|3. API Call + JWT| AppSync
    AppSync -->|4. Verify| Cognito
    AppSync -->|5. Check Role| IAM
    AppSync -->|6. Invoke| Lambda
    Lambda -->|7. Assume Role| IAM
    Lambda -->|8. Query/Write| DynamoDB

    classDef client fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef auth fill:#FF9500,stroke:#CC7700,color:#fff
    classDef authz fill:#34C759,stroke:#28A745,color:#fff
    classDef data fill:#AF52DE,stroke:#8B3FC7,color:#fff

    class Browser client
    class Cognito,JWT auth
    class AppSync,IAM authz
    class Lambda,DynamoDB data
```

## Monitoring & Observability

```mermaid
graph TB
    subgraph "Application"
        Lambda[Lambda Functions]
        AppSync[AppSync]
        DynamoDB[(DynamoDB)]
    end

    subgraph "Metrics Collection"
        CW[CloudWatch Metrics]
        Logs[CloudWatch Logs]
    end

    subgraph "Alerting"
        Alarms[CloudWatch Alarms]
        SNS[SNS Topics]
        Slack[Slack Notifications]
    end

    subgraph "Analytics"
        Domo[Domo Dashboard]
        Probe[Nightly Probe]
    end

    Lambda -->|Emit| CW
    Lambda -->|Write| Logs
    AppSync -->|Emit| CW
    DynamoDB -->|Emit| CW

    CW -->|Threshold Breach| Alarms
    Alarms -->|Publish| SNS
    SNS -->|Notify| Slack

    Probe -->|Test E2E| AppSync
    Probe -->|Report| CW
    CW -->|Export| Domo

    classDef app fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef metrics fill:#34C759,stroke:#28A745,color:#fff
    classDef alerts fill:#FF3B30,stroke:#CC2E26,color:#fff
    classDef analytics fill:#FFD60A,stroke:#CCA808,color:#000

    class Lambda,AppSync,DynamoDB app
    class CW,Logs metrics
    class Alarms,SNS,Slack alerts
    class Domo,Probe analytics
```

---

**Document Version**: 1.0  
**Created**: 2025-11-14  
**Format**: Mermaid diagrams (render in GitHub, GitLab, or Mermaid Live Editor)  
**Status**: Production Architecture
