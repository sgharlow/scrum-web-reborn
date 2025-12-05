/**
 * Mock data for hook tests
 */

export const mockAuthUser = {
  userId: 'user-123',
  username: 'test@example.com',
};

export const mockAuthSession = {
  tokens: {
    idToken: {
      toString: () => 'mock-jwt-token',
    },
    accessToken: {
      toString: () => 'mock-access-token',
    },
  },
};

export const mockRoom = {
  id: 'room-123',
  name: 'Test Room',
  code: 'ABC123',
  stage: 'PLANNING',
  createdBy: 'user-123',
  createdAt: '2025-11-14T00:00:00Z',
  updatedAt: '2025-11-14T00:00:00Z',
};

export const mockStory = {
  id: 'story-456',
  roomId: 'room-123',
  title: 'Test Story',
  description: 'Test description',
  voteCount: 0,
  avgVote: null,
  revealed: false,
  status: 'PENDING',
  createdAt: '2025-11-14T00:00:00Z',
  updatedAt: '2025-11-14T00:00:00Z',
};

export const mockVote = {
  userId: 'user-123',
  storyId: 'story-456',
  roomId: 'room-123',
  value: '5',
  createdAt: '2025-11-14T00:00:00Z',
};

export const mockPresence = {
  userId: 'user-123',
  roomId: 'room-123',
  displayName: 'Test User',
  role: 'MODERATOR',
  state: 'ONLINE',
  lastSeen: '2025-11-14T00:00:00Z',
};

export const mockGraphQLResponse = {
  data: {
    createRoom: mockRoom,
  },
  errors: null,
};

export const mockGraphQLError = {
  data: null,
  errors: [
    {
      message: 'GraphQL error occurred',
      locations: [],
      path: [],
    },
  ],
};

export const mockSubscriptionMessage = <T>(data: T) => ({
  provider: 'appsync',
  value: {
    data,
  },
});

export const mockSubscriptionData = {
  onRoomEvent: {
    roomId: 'room-123',
    eventType: 'STORY_CREATED',
    data: {
      id: 'story-456',
      title: 'New Story',
    },
  },
};
