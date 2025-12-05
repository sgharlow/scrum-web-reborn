import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// ============================================================================
// NIGHTLY SYNTHETIC PROBE
// ============================================================================
//
// This Lambda function runs daily at 07:00 UTC to test the full E2E flow:
// 1. Create a test user (or sign in if exists)
// 2. Create a room
// 3. Join the room
// 4. Create a story
// 5. Cast votes
// 6. Reveal votes
// 7. Verify vote tally updated
//
// Metrics emitted:
// - ProbeSuccess/ProbeFailure (Count)
// - ProbeLatency (Milliseconds)
// - ConnectivitySuccess (Count)
//
// On failure, sends alert to Slack (via SNS topic)
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

interface ProbeResult {
  success: boolean;
  latency: number;
  error?: string;
  steps: {
    [key: string]: {
      success: boolean;
      latency: number;
      error?: string;
    };
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const CLIENT_ID = process.env.CLIENT_ID!;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const NAMESPACE = 'ScrumReborn';

const cognito = new CognitoIdentityProviderClient({ region: AWS_REGION });
const cloudwatch = new CloudWatchClient({ region: AWS_REGION });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Emit CloudWatch custom metric
 */
async function emitMetric(
  metricName: string,
  value: number,
  unit: 'Count' | 'Milliseconds' = 'Count'
): Promise<void> {
  try {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
          },
        ],
      })
    );
  } catch (error: any) {
    console.error('Failed to emit metric:', error.message);
  }
}

/**
 * Execute GraphQL query/mutation
 */
async function executeGraphQL(
  query: string,
  variables: Record<string, any>,
  token: string
): Promise<any> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result: any = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * Get or create test user and return JWT token
 */
async function getTestUserToken(): Promise<string> {
  const username = `probe-user-${Date.now()}`;
  const password = 'ProbeTest123!';
  const email = `probe-${Date.now()}@example.com`;

  try {
    // Try to sign up
    await cognito.send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
        ],
      })
    );

    // Confirm user (admin action)
    await cognito.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );

    console.log('Created and confirmed test user:', username);
  } catch (error: any) {
    console.log('User creation failed (may already exist):', error.message);
  }

  // Sign in to get token
  const authResult = await cognito.send(
    new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    })
  );

  if (!authResult.AuthenticationResult?.IdToken) {
    throw new Error('Failed to get ID token');
  }

  return authResult.AuthenticationResult.IdToken;
}

/**
 * Run a single probe step
 */
async function runStep(
  name: string,
  fn: () => Promise<any>
): Promise<{ success: boolean; latency: number; error?: string; result?: any }> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const latency = Date.now() - startTime;

    console.log(`✓ Step ${name} completed in ${latency}ms`);

    return { success: true, latency, result };
  } catch (error: any) {
    const latency = Date.now() - startTime;

    console.error(`✗ Step ${name} failed in ${latency}ms:`, error.message);

    return { success: false, latency, error: error.message };
  }
}

// ============================================================================
// PROBE STEPS
// ============================================================================

async function probeCreateRoom(token: string): Promise<any> {
  const mutation = `
    mutation CreateRoom($name: String!, $code: String!) {
      createRoom(name: $name, code: $code) {
        id
        name
        code
        stage
      }
    }
  `;

  const code = `PROBE${Math.floor(Math.random() * 1000)}`;

  const data = await executeGraphQL(
    mutation,
    { name: 'Probe Test Room', code },
    token
  );

  return data.createRoom;
}

async function probeJoinRoom(token: string, code: string): Promise<any> {
  const mutation = `
    mutation JoinRoom($code: String!, $displayName: String!, $role: MemberRole!) {
      joinRoom(code: $code, displayName: $displayName, role: $role) {
        userId
        roomId
        displayName
        role
        state
      }
    }
  `;

  const data = await executeGraphQL(
    mutation,
    { code, displayName: 'Probe User', role: 'MODERATOR' },
    token
  );

  return data.joinRoom;
}

async function probeCreateStory(token: string, roomId: string): Promise<any> {
  const mutation = `
    mutation CreateStory($roomId: ID!, $title: String!, $description: String) {
      createStory(roomId: $roomId, title: $title, description: $description) {
        id
        roomId
        title
        voteCount
        avgVote
        revealed
      }
    }
  `;

  const data = await executeGraphQL(
    mutation,
    {
      roomId,
      title: 'Probe Test Story',
      description: 'Testing E2E flow',
    },
    token
  );

  return data.createStory;
}

async function probeCastVote(
  token: string,
  roomId: string,
  storyId: string
): Promise<any> {
  const mutation = `
    mutation CastVote($roomId: ID!, $storyId: ID!, $value: String!) {
      castVote(roomId: $roomId, storyId: $storyId, value: $value) {
        userId
        storyId
        value
      }
    }
  `;

  const data = await executeGraphQL(
    mutation,
    { roomId, storyId, value: '5' },
    token
  );

  return data.castVote;
}

async function probeRevealVotes(
  token: string,
  roomId: string,
  storyId: string
): Promise<any> {
  const mutation = `
    mutation RevealVotes($roomId: ID!, $storyId: ID!) {
      revealVotes(roomId: $roomId, storyId: $storyId) {
        id
        voteCount
        avgVote
        revealed
      }
    }
  `;

  const data = await executeGraphQL(
    mutation,
    { roomId, storyId },
    token
  );

  return data.revealVotes;
}

async function probeVerifyTally(
  token: string,
  roomId: string,
  storyId: string
): Promise<any> {
  // Wait a bit for tally processor to complete
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const query = `
    query GetStory($roomId: ID!, $storyId: ID!) {
      getStory(roomId: $roomId, storyId: $storyId) {
        id
        voteCount
        avgVote
        revealed
      }
    }
  `;

  const data = await executeGraphQL(query, { roomId, storyId }, token);

  const story = data.getStory;

  if (story.voteCount !== 1) {
    throw new Error(`Expected voteCount=1, got ${story.voteCount}`);
  }

  if (story.avgVote !== 5) {
    throw new Error(`Expected avgVote=5, got ${story.avgVote}`);
  }

  return story;
}

// ============================================================================
// MAIN PROBE HANDLER
// ============================================================================

export const handler = async (): Promise<ProbeResult> => {
  const probeStartTime = Date.now();
  const result: ProbeResult = {
    success: false,
    latency: 0,
    steps: {},
  };

  console.log('🔍 Starting nightly synthetic probe...');

  try {
    // Step 1: Get test user token
    const authStep = await runStep('auth', () => getTestUserToken());
    result.steps.auth = authStep;

    if (!authStep.success) {
      throw new Error('Authentication failed');
    }

    const token = authStep.result;

    // Step 2: Create room
    const createRoomStep = await runStep('createRoom', () =>
      probeCreateRoom(token)
    );
    result.steps.createRoom = createRoomStep;

    if (!createRoomStep.success) {
      throw new Error('Create room failed');
    }

    const room = createRoomStep.result;

    // Step 3: Join room
    const joinRoomStep = await runStep('joinRoom', () =>
      probeJoinRoom(token, room.code)
    );
    result.steps.joinRoom = joinRoomStep;

    if (!joinRoomStep.success) {
      throw new Error('Join room failed');
    }

    const presence = joinRoomStep.result;

    // Step 4: Create story
    const createStoryStep = await runStep('createStory', () =>
      probeCreateStory(token, presence.roomId)
    );
    result.steps.createStory = createStoryStep;

    if (!createStoryStep.success) {
      throw new Error('Create story failed');
    }

    const story = createStoryStep.result;

    // Step 5: Cast vote
    const castVoteStep = await runStep('castVote', () =>
      probeCastVote(token, presence.roomId, story.id)
    );
    result.steps.castVote = castVoteStep;

    if (!castVoteStep.success) {
      throw new Error('Cast vote failed');
    }

    // Step 6: Reveal votes
    const revealVotesStep = await runStep('revealVotes', () =>
      probeRevealVotes(token, presence.roomId, story.id)
    );
    result.steps.revealVotes = revealVotesStep;

    if (!revealVotesStep.success) {
      throw new Error('Reveal votes failed');
    }

    // Step 7: Verify tally
    const verifyTallyStep = await runStep('verifyTally', () =>
      probeVerifyTally(token, presence.roomId, story.id)
    );
    result.steps.verifyTally = verifyTallyStep;

    if (!verifyTallyStep.success) {
      throw new Error('Verify tally failed');
    }

    // All steps passed!
    result.success = true;
    result.latency = Date.now() - probeStartTime;

    console.log(`✓ Probe completed successfully in ${result.latency}ms`);

    // Emit success metrics
    await emitMetric('ProbeSuccess', 1, 'Count');
    await emitMetric('ProbeLatency', result.latency, 'Milliseconds');
    await emitMetric('ConnectivitySuccess', 1, 'Count');
  } catch (error: any) {
    result.success = false;
    result.latency = Date.now() - probeStartTime;
    result.error = error.message;

    console.error(`✗ Probe failed after ${result.latency}ms:`, error.message);

    // Emit failure metrics
    await emitMetric('ProbeFailure', 1, 'Count');
    await emitMetric('ProbeLatency', result.latency, 'Milliseconds');
  }

  return result;
};
