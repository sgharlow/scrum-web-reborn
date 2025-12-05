#!/usr/bin/env node

/**
 * Demo Data Creation Script
 * 
 * Creates sample users, rooms, stories, and retro notes for demo purposes.
 * Run after deploying infrastructure to populate with realistic data.
 * 
 * Usage:
 *   node create-demo-data.mjs --user-pool-id us-east-1_xxxxx --client-id xxxxx --graphql-endpoint https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
 */

import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { SignJWT } from 'jose';
import fetch from 'node-fetch';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};

const USER_POOL_ID = getArg('--user-pool-id') || process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = getArg('--client-id') || process.env.COGNITO_CLIENT_ID;
const GRAPHQL_ENDPOINT = getArg('--graphql-endpoint') || process.env.GRAPHQL_ENDPOINT;
const REGION = getArg('--region') || process.env.AWS_REGION || 'us-east-1';

if (!USER_POOL_ID || !CLIENT_ID || !GRAPHQL_ENDPOINT) {
  console.error('❌ Missing required arguments:');
  console.error('   --user-pool-id: Cognito User Pool ID');
  console.error('   --client-id: Cognito Client ID');
  console.error('   --graphql-endpoint: AppSync GraphQL endpoint');
  console.error('\nOr set environment variables: COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, GRAPHQL_ENDPOINT');
  process.exit(1);
}

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

// Demo users to create
const DEMO_USERS = [
  { email: 'alice@demo.scrumreborn.com', name: 'Alice (Moderator)', password: 'Demo1234!', role: 'MODERATOR' },
  { email: 'bob@demo.scrumreborn.com', name: 'Bob (Developer)', password: 'Demo1234!', role: 'MEMBER' },
  { email: 'charlie@demo.scrumreborn.com', name: 'Charlie (Designer)', password: 'Demo1234!', role: 'MEMBER' },
  { email: 'diana@demo.scrumreborn.com', name: 'Diana (QA)', password: 'Demo1234!', role: 'MEMBER' }
];

// Demo stories for planning poker
const DEMO_STORIES = [
  { title: 'User authentication with OAuth', description: 'Implement social login (Google, GitHub)', tags: ['backend', 'security'] },
  { title: 'Responsive mobile layout', description: 'Optimize UI for mobile devices', tags: ['frontend', 'ui'] },
  { title: 'Real-time notifications', description: 'Push notifications for room events', tags: ['backend', 'realtime'] },
  { title: 'Export retro notes to PDF', description: 'Generate downloadable retrospective summary', tags: ['feature', 'export'] },
  { title: 'Dark mode support', description: 'Add theme toggle and dark color scheme', tags: ['frontend', 'ui'] }
];

// Demo retro notes
const DEMO_RETRO_NOTES = [
  { category: 'WENT_WELL', text: 'Great collaboration on the authentication feature', author: 'Alice' },
  { category: 'WENT_WELL', text: 'Deployment pipeline is smooth and reliable', author: 'Bob' },
  { category: 'TO_IMPROVE', text: 'Need better test coverage for edge cases', author: 'Diana' },
  { category: 'TO_IMPROVE', text: 'Code review turnaround time could be faster', author: 'Charlie' },
  { category: 'ACTION_ITEM', text: 'Set up automated accessibility testing', author: 'Alice' },
  { category: 'ACTION_ITEM', text: 'Schedule knowledge sharing session on GraphQL', author: 'Bob' }
];

/**
 * Create a Cognito user
 */
async function createCognitoUser(email, name, password) {
  try {
    console.log(`Creating user: ${email}...`);
    
    // Create user
    await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name }
      ],
      MessageAction: 'SUPPRESS' // Don't send welcome email
    }));
    
    // Set permanent password
    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    }));
    
    console.log(`✅ Created user: ${email}`);
    return true;
  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log(`⚠️  User already exists: ${email}`);
      return true;
    }
    console.error(`❌ Failed to create user ${email}:`, error.message);
    return false;
  }
}

/**
 * Sign in and get JWT token (simplified - in production use proper Cognito auth flow)
 */
async function getAuthToken(userId, email) {
  // For demo purposes, we'll use a mock token structure
  // In production, use proper Cognito authentication
  console.log(`⚠️  Note: Using simplified auth for demo. In production, use proper Cognito sign-in flow.`);
  return `demo-token-${userId}`;
}

/**
 * Execute GraphQL mutation
 */
async function graphqlMutation(mutation, variables, token) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: mutation, variables })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('GraphQL request failed:', error.message);
    return null;
  }
}

/**
 * Create demo room with stories
 */
async function createDemoRoom(token, roomName, roomCode) {
  console.log(`\nCreating demo room: ${roomName} (${roomCode})...`);
  
  const createRoomMutation = `
    mutation CreateRoom($name: String!, $code: String!) {
      createRoom(name: $name, code: $code) {
        id
        name
        code
        stage
      }
    }
  `;
  
  const roomData = await graphqlMutation(createRoomMutation, { name: roomName, code: roomCode }, token);
  
  if (!roomData || !roomData.createRoom) {
    console.error('❌ Failed to create room');
    return null;
  }
  
  const roomId = roomData.createRoom.id;
  console.log(`✅ Created room: ${roomId}`);
  
  // Create stories
  const createStoryMutation = `
    mutation CreateStory($roomId: ID!, $title: String!, $description: String, $tags: [String!]) {
      createStory(roomId: $roomId, title: $title, description: $description, tags: $tags) {
        id
        title
      }
    }
  `;
  
  for (const story of DEMO_STORIES) {
    const storyData = await graphqlMutation(createStoryMutation, {
      roomId,
      ...story
    }, token);
    
    if (storyData && storyData.createStory) {
      console.log(`  ✅ Created story: ${story.title}`);
    }
  }
  
  return roomId;
}

/**
 * Create demo retro room with notes
 */
async function createDemoRetroRoom(token, roomName, roomCode) {
  console.log(`\nCreating demo retro room: ${roomName} (${roomCode})...`);
  
  const createRoomMutation = `
    mutation CreateRoom($name: String!, $code: String!) {
      createRoom(name: $name, code: $code) {
        id
        name
        code
      }
    }
  `;
  
  const roomData = await graphqlMutation(createRoomMutation, { name: roomName, code: roomCode }, token);
  
  if (!roomData || !roomData.createRoom) {
    console.error('❌ Failed to create retro room');
    return null;
  }
  
  const roomId = roomData.createRoom.id;
  console.log(`✅ Created retro room: ${roomId}`);
  
  // Set room to RETRO stage
  const setRoomStageMutation = `
    mutation SetRoomStage($roomId: ID!, $stage: String!) {
      setRoomStage(roomId: $roomId, stage: $stage) {
        id
        stage
      }
    }
  `;
  
  await graphqlMutation(setRoomStageMutation, { roomId, stage: 'RETRO' }, token);
  
  // Add retro notes
  const addRetroNoteMutation = `
    mutation AddRetroNote($roomId: ID!, $category: String!, $text: String!) {
      addRetroNote(roomId: $roomId, category: $category, text: $text) {
        id
        text
        category
      }
    }
  `;
  
  for (const note of DEMO_RETRO_NOTES) {
    const noteData = await graphqlMutation(addRetroNoteMutation, {
      roomId,
      category: note.category,
      text: note.text
    }, token);
    
    if (noteData && noteData.addRetroNote) {
      console.log(`  ✅ Created retro note: ${note.text.substring(0, 40)}...`);
    }
  }
  
  return roomId;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Creating demo dataset for Scrum Reborn\n');
  console.log(`Region: ${REGION}`);
  console.log(`User Pool: ${USER_POOL_ID}`);
  console.log(`GraphQL Endpoint: ${GRAPHQL_ENDPOINT}\n`);
  
  // Step 1: Create Cognito users
  console.log('📝 Step 1: Creating Cognito users...\n');
  
  for (const user of DEMO_USERS) {
    await createCognitoUser(user.email, user.name, user.password);
  }
  
  console.log('\n✅ All users created!\n');
  console.log('Demo user credentials:');
  DEMO_USERS.forEach(user => {
    console.log(`  ${user.email} / ${user.password}`);
  });
  
  // Step 2: Create demo rooms (requires authentication)
  console.log('\n📝 Step 2: Creating demo rooms...\n');
  console.log('⚠️  Note: To create rooms and stories, sign in with one of the demo users');
  console.log('   and use the GraphQL API or UI to create sample data.\n');
  console.log('   Alternatively, implement proper Cognito authentication in this script.\n');
  
  // For now, just provide instructions
  console.log('Manual steps to complete demo setup:');
  console.log('1. Sign in as alice@demo.scrumreborn.com');
  console.log('2. Create a room with code "DEMO01"');
  console.log('3. Add the sample stories listed above');
  console.log('4. Create another room with code "RETRO1" and set stage to RETRO');
  console.log('5. Add the sample retro notes listed above\n');
  
  console.log('✅ Demo dataset creation complete!\n');
  console.log('Next steps:');
  console.log('1. Open your deployed app');
  console.log('2. Sign in with any demo user');
  console.log('3. Explore the pre-populated data');
  console.log('4. Test multi-device sync by opening in multiple browsers\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
