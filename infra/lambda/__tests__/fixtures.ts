/**
 * Test fixtures for Lambda unit tests
 * Provides mock data for rooms, votes, presence, stories, and retro notes
 */

export const mockRoom = {
  id: 'test-room-123',
  name: 'Test Room',
  code: 'ABC123',
  stage: 'PLANNING',
  createdBy: 'user-123',
  createdAt: '2025-11-14T00:00:00Z',
  updatedAt: '2025-11-14T00:00:00Z',
};

export const mockStory = {
  id: 'story-456',
  roomId: 'test-room-123',
  title: 'Test Story',
  description: 'Test description',
  voteCount: 0,
  avgVote: null,
  revealed: false,
  status: 'PENDING',
  tags: ['backend', 'api'],
  createdAt: '2025-11-14T00:00:00Z',
  updatedAt: '2025-11-14T00:00:00Z',
};

export const mockVotes = [
  {
    userId: 'user-1',
    storyId: 'story-456',
    roomId: 'test-room-123',
    value: '5',
    createdAt: '2025-11-14T00:00:00Z',
  },
  {
    userId: 'user-2',
    storyId: 'story-456',
    roomId: 'test-room-123',
    value: '8',
    createdAt: '2025-11-14T00:00:00Z',
  },
  {
    userId: 'user-3',
    storyId: 'story-456',
    roomId: 'test-room-123',
    value: '☕',
    createdAt: '2025-11-14T00:00:00Z',
  },
];

export const mockPresence = {
  userId: 'user-123',
  roomId: 'test-room-123',
  displayName: 'Test User',
  role: 'MODERATOR',
  state: 'ONLINE',
  lastSeen: '2025-11-14T00:00:00Z',
  ttl: Math.floor(Date.now() / 1000) + 300,
};

export const mockRetroNote = {
  id: 'retro-789',
  roomId: 'test-room-123',
  category: 'WENT_WELL',
  text: 'Great collaboration',
  authorId: 'user-123',
  votes: 0,
  createdAt: '2025-11-14T00:00:00Z',
};

/**
 * Create a mock AppSync event for testing
 */
export function createMockAppSyncEvent(
  fieldName: string,
  args: Record<string, any>,
  userId: string = 'user-123'
) {
  return {
    info: {
      fieldName,
      parentTypeName: fieldName.startsWith('get') || fieldName.startsWith('list') ? 'Query' : 'Mutation',
      selectionSetList: [],
      selectionSetGraphQL: '',
      variables: {},
    },
    arguments: args,
    identity: {
      sub: userId,
      username: 'testuser',
      claims: {},
    },
    request: {
      headers: {},
    },
    prev: null,
    source: null,
    stash: {},
  };
}

/**
 * Create a mock DynamoDB Stream event for testing
 */
export function createMockStreamEvent(
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE',
  roomId: string,
  storyId: string,
  userId: string,
  value?: string
) {
  const event: any = {
    eventID: `event-${Date.now()}`,
    eventName,
    eventVersion: '1.0',
    eventSource: 'aws:dynamodb',
    awsRegion: 'us-east-1',
    dynamodb: {
      Keys: {
        PK: { S: `ROOM#${roomId}` },
        SK: { S: `VOTE#${storyId}#${userId}` },
      },
      SequenceNumber: '1',
      SizeBytes: 100,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
  };

  if (eventName === 'INSERT' || eventName === 'MODIFY') {
    event.dynamodb.NewImage = {
      PK: { S: `ROOM#${roomId}` },
      SK: { S: `VOTE#${storyId}#${userId}` },
      userId: { S: userId },
      storyId: { S: storyId },
      roomId: { S: roomId },
      value: { S: value || '5' },
      createdAt: { S: '2025-11-14T00:00:00Z' },
    };
  }

  if (eventName === 'REMOVE' || eventName === 'MODIFY') {
    event.dynamodb.OldImage = {
      PK: { S: `ROOM#${roomId}` },
      SK: { S: `VOTE#${storyId}#${userId}` },
      userId: { S: userId },
      storyId: { S: storyId },
      roomId: { S: roomId },
      value: { S: value || '5' },
      createdAt: { S: '2025-11-14T00:00:00Z' },
    };
  }

  return event;
}
