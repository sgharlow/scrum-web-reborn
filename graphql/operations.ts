// GraphQL Mutations
export const CREATE_ROOM = `
  mutation CreateRoom($name: String!, $code: String!) {
    createRoom(name: $name, code: $code) {
      id
      name
      code
      stage
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const JOIN_ROOM = `
  mutation JoinRoom($code: String!, $displayName: String!, $role: MemberRole) {
    joinRoom(code: $code, displayName: $displayName, role: $role) {
      userId
      roomId
      displayName
      role
      state
      lastSeen
    }
  }
`;

export const SET_PRESENCE = `
  mutation SetPresence($roomId: ID!, $state: MemberState) {
    setPresence(roomId: $roomId, state: $state) {
      userId
      roomId
      displayName
      role
      state
      lastSeen
    }
  }
`;

export const CREATE_STORY = `
  mutation CreateStory($roomId: ID!, $title: String!, $description: String, $tags: [String!]) {
    createStory(roomId: $roomId, title: $title, description: $description, tags: $tags) {
      id
      roomId
      title
      description
      voteCount
      avgVote
      revealed
      status
      tags
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_STORY = `
  mutation UpdateStory($roomId: ID!, $storyId: ID!, $title: String, $description: String, $tags: [String!], $status: StoryStatus) {
    updateStory(roomId: $roomId, storyId: $storyId, title: $title, description: $description, tags: $tags, status: $status) {
      id
      roomId
      title
      description
      voteCount
      avgVote
      revealed
      status
      tags
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_STORY = `
  mutation DeleteStory($roomId: ID!, $storyId: ID!) {
    deleteStory(roomId: $roomId, storyId: $storyId)
  }
`;

export const CAST_VOTE = `
  mutation CastVote($roomId: ID!, $storyId: ID!, $value: String!) {
    castVote(roomId: $roomId, storyId: $storyId, value: $value) {
      userId
      storyId
      roomId
      value
      createdAt
    }
  }
`;

export const REVEAL_VOTES = `
  mutation RevealVotes($roomId: ID!, $storyId: ID!) {
    revealVotes(roomId: $roomId, storyId: $storyId) {
      id
      roomId
      title
      description
      voteCount
      avgVote
      revealed
      status
      tags
      createdAt
      updatedAt
    }
  }
`;

export const ADD_RETRO_NOTE = `
  mutation AddRetroNote($roomId: ID!, $category: RetroCategory!, $text: String!) {
    addRetroNote(roomId: $roomId, category: $category, text: $text) {
      id
      roomId
      category
      text
      authorId
      votes
      createdAt
    }
  }
`;

export const VOTE_RETRO_NOTE = `
  mutation VoteRetroNote($roomId: ID!, $noteId: ID!, $delta: Int!) {
    voteRetroNote(roomId: $roomId, noteId: $noteId, delta: $delta) {
      id
      roomId
      category
      text
      authorId
      votes
      createdAt
    }
  }
`;

export const SET_ROOM_STAGE = `
  mutation SetRoomStage($roomId: ID!, $stage: RoomStage!, $currentStoryId: ID) {
    setRoomStage(roomId: $roomId, stage: $stage, currentStoryId: $currentStoryId) {
      id
      roomId
      name
      code
      stage
      currentStoryId
      createdBy
      createdAt
      updatedAt
    }
  }
`;

// GraphQL Queries
export const GET_ROOM_BY_CODE = `
  query GetRoomByCode($code: String!) {
    getRoomByCode(code: $code) {
      id
      name
      code
      stage
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const LIST_STORIES = `
  query ListStories($roomId: ID!, $limit: Int, $nextToken: String) {
    listStories(roomId: $roomId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        roomId
        title
        description
        voteCount
        avgVote
        revealed
        status
        tags
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const LIST_PRESENCE = `
  query ListPresence($roomId: ID!) {
    listPresence(roomId: $roomId) {
      userId
      roomId
      displayName
      role
      state
      lastSeen
    }
  }
`;

export const LIST_RETRO = `
  query ListRetro($roomId: ID!, $limit: Int, $nextToken: String) {
    listRetro(roomId: $roomId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        roomId
        category
        text
        authorId
        votes
        createdAt
      }
      nextToken
    }
  }
`;

// GraphQL Subscriptions

// Subscribe to member joining - triggered immediately when someone joins
export const ON_MEMBER_JOINED = `
  subscription OnMemberJoined($roomId: ID!) {
    onMemberJoined(roomId: $roomId) {
      userId
      roomId
      displayName
      role
      state
      lastSeen
    }
  }
`;

export const ON_STORY_CREATED = `
  subscription OnStoryCreated($roomId: ID!) {
    onStoryCreated(roomId: $roomId) {
      id
      roomId
      title
      description
      voteCount
      avgVote
      revealed
      status
      tags
      createdAt
      updatedAt
    }
  }
`;

export const ON_STORY_UPDATED = `
  subscription OnStoryUpdated($roomId: ID!) {
    onStoryUpdated(roomId: $roomId) {
      id
      roomId
      title
      description
      voteCount
      avgVote
      revealed
      status
      tags
      createdAt
      updatedAt
    }
  }
`;

export const ON_STORY_DELETED = `
  subscription OnStoryDeleted($roomId: ID!) {
    onStoryDeleted(roomId: $roomId)
  }
`;

export const ON_VOTE_CAST = `
  subscription OnVoteCast($roomId: ID!, $storyId: ID) {
    onVoteCast(roomId: $roomId, storyId: $storyId) {
      userId
      storyId
      roomId
      value
      createdAt
    }
  }
`;

export const ON_VOTES_REVEALED = `
  subscription OnVotesRevealed($roomId: ID!, $storyId: ID) {
    onVotesRevealed(roomId: $roomId, storyId: $storyId) {
      id
      roomId
      title
      description
      voteCount
      avgVote
      revealed
      status
      tags
      createdAt
      updatedAt
    }
  }
`;

export const ON_PRESENCE_CHANGED = `
  subscription OnPresenceChanged($roomId: ID!) {
    onPresenceChanged(roomId: $roomId) {
      userId
      roomId
      displayName
      role
      state
      lastSeen
    }
  }
`;

export const ON_RETRO_NOTE_ADDED = `
  subscription OnRetroNoteAdded($roomId: ID!) {
    onRetroNoteAdded(roomId: $roomId) {
      id
      roomId
      category
      text
      authorId
      votes
      createdAt
    }
  }
`;

export const ON_RETRO_NOTE_VOTED = `
  subscription OnRetroNoteVoted($roomId: ID!) {
    onRetroNoteVoted(roomId: $roomId) {
      id
      roomId
      category
      text
      authorId
      votes
      createdAt
    }
  }
`;

export const ON_STAGE_CHANGED = `
  subscription OnStageChanged($roomId: ID!) {
    onStageChanged(roomId: $roomId) {
      id
      roomId
      name
      code
      stage
      currentStoryId
      createdBy
      createdAt
      updatedAt
    }
  }
`;
