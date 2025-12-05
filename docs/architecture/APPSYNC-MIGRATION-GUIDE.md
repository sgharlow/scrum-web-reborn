# AppSync Migration Guide

## Overview
This document outlines the migration from PeerJS (P2P) to AWS AppSync (GraphQL) for real-time collaboration.

## Key Changes

### 1. Remove PeerJS Dependencies
- Remove `useCollaboration` hook usage
- Remove PeerJS initialization code
- Remove peer connection management

### 2. Add AppSync Integration
- Import AWS Amplify configuration
- Use `useAuth` for authentication
- Use `useGraphQL` for mutations/queries
- Use `useSubscription` for real-time updates

### 3. State Management Changes
- Replace P2P broadcast with GraphQL mutations
- Replace P2P subscriptions with AppSync subscriptions
- Add optimistic updates with rollback

### 4. Authentication Flow
- Add sign-in/sign-up before joining room
- Store auth token for GraphQL requests
- Handle token refresh

## Implementation Steps

### Step 1: Update Imports
```typescript
// Remove
import { useCollaboration } from './hooks/useCollaboration';

// Add
import { useAuth } from './hooks/useAuth';
import { useGraphQL } from './hooks/useGraphQL';
import { useMultipleSubscriptions } from './hooks/useSubscription';
import './src/aws-config';
```

### Step 2: Replace CollaborationProvider
The CollaborationProvider needs to:
1. Use GraphQL mutations instead of P2P broadcast
2. Subscribe to AppSync subscriptions
3. Handle presence heartbeats (30s interval)
4. Implement optimistic updates

### Step 3: Update Room Join Flow
1. Authenticate user first
2. Call `createRoom` or `joinRoom` GraphQL mutation
3. Subscribe to room events
4. Start presence heartbeat

### Step 4: Add Authentication UI
Create AuthFlow component with:
- Sign-in form
- Sign-up form  
- Password validation
- Error handling

## Next Steps
1. Create simplified App.tsx with AppSync
2. Test authentication flow
3. Test room creation/joining
4. Test real-time updates
5. Test presence heartbeats
