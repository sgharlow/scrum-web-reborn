import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { randomUUID } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface AppSyncEvent {
  info: {
    fieldName: string;
    parentTypeName: string;
  };
  arguments: Record<string, any>;
  identity: {
    sub: string;
    username?: string;
    claims?: Record<string, any>;
  };
  request: {
    headers: Record<string, string>;
  };
}

interface Logger {
  info: (message: string, context?: Record<string, any>) => void;
  error: (message: string, context?: Record<string, any>) => void;
  warn: (message: string, context?: Record<string, any>) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_NAME = process.env.TABLE_NAME || 'ScrumRealtimeTable';
const ALLOWED_VOTES = ['1', '2', '3', '5', '8', '13', '21', '☕', '❓'];
const ROOM_CODE_REGEX = /^[A-Z0-9-]{3,20}$/; // 3-20 chars, allows hyphens for readable codes
const NAMESPACE = 'ScrumReborn';

const dynamodb = new DynamoDBClient({});
const cloudwatch = new CloudWatchClient({});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract user ID from AppSync context
 */
function userIdOf(event: AppSyncEvent): string {
  return event.identity.sub;
}

/**
 * Generate ISO timestamp
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Create structured logger with context
 */
function createLogger(event: AppSyncEvent): Logger {
  const context = {
    fieldName: event.info.fieldName,
    userId: userIdOf(event),
  };

  return {
    info: (message: string, extra?: Record<string, any>) => {
      console.log(JSON.stringify({ level: 'INFO', message, ...context, ...extra }));
    },
    error: (message: string, extra?: Record<string, any>) => {
      console.error(JSON.stringify({ level: 'ERROR', message, ...context, ...extra }));
    },
    warn: (message: string, extra?: Record<string, any>) => {
      console.warn(JSON.stringify({ level: 'WARN', message, ...context, ...extra }));
    },
  };
}

/**
 * Emit CloudWatch custom metric
 */
async function emitMetric(
  metricName: string,
  value: number,
  unit: 'Count' | 'Milliseconds' = 'Count',
  dimensions?: Record<string, string>
): Promise<void> {
  try {
    const metricData: any = {
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
    };

    if (dimensions) {
      metricData.Dimensions = Object.entries(dimensions).map(([Name, Value]) => ({
        Name,
        Value,
      }));
    }

    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [metricData],
      })
    );
  } catch (error: any) {
    // Don't fail the request if metrics fail
    console.error('Failed to emit metric:', error.message);
  }
}

/**
 * Get user's role from presence record
 */
async function getUserRole(roomId: string, userId: string): Promise<string | null> {
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `PRES#${userId}`,
      }),
    })
  );

  if (!result.Item) {
    return null;
  }

  const presence = unmarshall(result.Item);
  return presence.role || 'MEMBER';
}

// ============================================================================
// ROOM MUTATIONS
// ============================================================================

async function createRoom(event: AppSyncEvent, logger: Logger) {
  const { name, code } = event.arguments;
  const userId = userIdOf(event);
  const roomId = randomUUID();
  const now = timestamp();

  // Validate room code format
  if (!ROOM_CODE_REGEX.test(code)) {
    throw new Error('Room code must be 3-20 uppercase alphanumeric characters (hyphens allowed)');
  }

  logger.info('room.create', { roomId, code });

  try {
    // Create room with dual GSI1 indexing for code lookup and user's rooms
    await dynamodb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall({
          PK: `ROOM#${roomId}`,
          SK: `ROOM#${roomId}`,
          GSI1PK: `ROOM_CODE#${code}`,
          GSI1SK: `ROOM#${roomId}`,
          id: roomId,
          name,
          code,
          stage: 'PLANNING',
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        }),
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

    // Create a second record for user's rooms index
    await dynamodb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall({
          PK: `USER#${userId}`,
          SK: `ROOM#${roomId}`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: `ROOM#${roomId}`,
          roomId,
          name,
          code,
          createdAt: now,
        }),
      })
    );

    return {
      id: roomId,
      name,
      code,
      stage: 'PLANNING',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error: any) {
    if (error.name === 'ConditionalCheckFailedException') {
      logger.warn('room.create.duplicate_code', { code });
      throw new Error(`Room code "${code}" already exists. Try: ${code}2`);
    }
    throw error;
  }
}

async function getRoomByCode(event: AppSyncEvent, logger: Logger) {
  const { code } = event.arguments;

  logger.info('room.get_by_code', { code });

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: marshall({
        ':gsi1pk': `ROOM_CODE#${code}`,
      }),
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    throw new Error('Room code not found. Double-check the code.');
  }

  const room = unmarshall(result.Items[0]);

  // Fetch the full room record
  const roomResult = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${room.roomId || room.id}`,
        SK: `ROOM#${room.roomId || room.id}`,
      }),
    })
  );

  if (!roomResult.Item) {
    throw new Error('Room not found');
  }

  return unmarshall(roomResult.Item);
}

async function listRooms(event: AppSyncEvent, logger: Logger) {
  const userId = userIdOf(event);
  const { limit = 20, nextToken } = event.arguments;

  logger.info('room.list', { userId });

  const params: any = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: marshall({
      ':gsi1pk': `USER#${userId}`,
    }),
    Limit: limit,
  };

  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await dynamodb.send(new QueryCommand(params));

  const items = (result.Items || []).map((item) => unmarshall(item));

  return {
    items,
    nextToken: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null,
  };
}

async function setRoomStage(event: AppSyncEvent, logger: Logger) {
  const { roomId, stage, currentStoryId } = event.arguments;
  const userId = userIdOf(event);

  // Check if user is moderator
  const role = await getUserRole(roomId, userId);
  if (role !== 'MODERATOR') {
    throw new Error('Only the moderator can change the room stage.');
  }

  const validStages = ['PLANNING', 'VOTING', 'RETRO', 'COMPLETE'];
  if (!validStages.includes(stage)) {
    throw new Error(`Invalid stage. Must be one of: ${validStages.join(', ')}`);
  }

  logger.info('room.set_stage', { roomId, stage, currentStoryId });

  const now = timestamp();

  // Build update expression dynamically based on whether currentStoryId is provided
  let updateExpression = 'SET stage = :stage, updatedAt = :updatedAt';
  const expressionValues: Record<string, any> = {
    ':stage': stage,
    ':updatedAt': now,
  };

  if (currentStoryId !== undefined) {
    updateExpression += ', currentStoryId = :currentStoryId';
    expressionValues[':currentStoryId'] = currentStoryId;
  }

  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `ROOM#${roomId}`,
      }),
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: marshall(expressionValues),
      ConditionExpression: 'attribute_exists(PK)',
    })
  );

  // Fetch and return updated room
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `ROOM#${roomId}`,
      }),
    })
  );

  if (!result.Item) {
    throw new Error('Room not found');
  }

  const room = unmarshall(result.Item);
  // Add roomId field to match subscription filter (roomId must equal the id for filtering)
  return { ...room, roomId: room.id };
}

async function joinRoom(event: AppSyncEvent, logger: Logger) {
  const { code, displayName, role: requestedRole } = event.arguments;
  const userId = userIdOf(event);
  const startTime = Date.now();

  logger.info('room.join', { code, displayName, requestedRole });

  try {
    // Lookup room by code
    const room = await getRoomByCode(event, logger);
    const roomId = room.id;

    // Determine role: if user is room creator, make them MODERATOR, otherwise MEMBER
    // Handle null/undefined from GraphQL by defaulting to role based on creator status
    let assignedRole: string;
    if (requestedRole && requestedRole !== null) {
      assignedRole = requestedRole;
    } else {
      // First member (room creator) becomes MODERATOR
      assignedRole = userId === room.createdBy ? 'MODERATOR' : 'MEMBER';
    }

    const now = timestamp();
    const ttl = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

    // Create presence record
    await dynamodb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall({
          PK: `ROOM#${roomId}`,
          SK: `PRES#${userId}`,
          userId,
          roomId,
          displayName,
          role: assignedRole,
          state: 'ONLINE',
          lastSeen: now,
          ttl,
        }),
      })
    );

    // Emit success metric
    await emitMetric('JoinRoomSuccess', 1, 'Count', { Operation: 'joinRoom' });

    return {
      userId,
      roomId,
      displayName,
      role: assignedRole,
      state: 'ONLINE',
      lastSeen: now,
    };
  } catch (error: any) {
    // Emit failure metric
    await emitMetric('JoinRoomFailure', 1, 'Count', { Operation: 'joinRoom' });
    throw error;
  } finally {
    // Emit latency metric
    const latency = Date.now() - startTime;
    await emitMetric('MutationLatency', latency, 'Milliseconds', { Operation: 'joinRoom' });
  }
}

async function leaveRoom(event: AppSyncEvent, logger: Logger) {
  const { roomId } = event.arguments;
  const userId = userIdOf(event);

  logger.info('room.leave', { roomId });

  await dynamodb.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `PRES#${userId}`,
      }),
    })
  );

  return true;
}

// ============================================================================
// STORY MUTATIONS
// ============================================================================

async function createStory(event: AppSyncEvent, logger: Logger) {
  const { roomId, title, description, tags = [] } = event.arguments;
  const storyId = randomUUID();
  const now = timestamp();

  logger.info('story.create', { roomId, storyId, title });

  await dynamodb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        PK: `ROOM#${roomId}`,
        SK: `STORY#${storyId}`,
        id: storyId,
        roomId,
        title,
        description: description || null,
        voteCount: 0,
        avgVote: null,
        revealed: false,
        status: 'PENDING',
        tags,
        createdAt: now,
        updatedAt: now,
      }),
    })
  );

  return {
    id: storyId,
    roomId,
    title,
    description: description || null,
    voteCount: 0,
    avgVote: null,
    revealed: false,
    status: 'PENDING',
    tags,
    createdAt: now,
    updatedAt: now,
  };
}

async function updateStory(event: AppSyncEvent, logger: Logger) {
  const { roomId, storyId, title, description, tags, status } = event.arguments;
  const now = timestamp();

  logger.info('story.update', { roomId, storyId });

  // Build dynamic update expression
  const updates: string[] = ['updatedAt = :updatedAt'];
  const values: Record<string, any> = { ':updatedAt': now };

  if (title !== undefined) {
    updates.push('title = :title');
    values[':title'] = title;
  }
  if (description !== undefined) {
    updates.push('description = :description');
    values[':description'] = description;
  }
  if (tags !== undefined) {
    updates.push('tags = :tags');
    values[':tags'] = tags;
  }
  if (status !== undefined) {
    updates.push('#status = :status');
    values[':status'] = status;
  }

  const updateExpression = `SET ${updates.join(', ')}`;

  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `STORY#${storyId}`,
      }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: status !== undefined ? { '#status': 'status' } : undefined,
      ExpressionAttributeValues: marshall(values),
      ConditionExpression: 'attribute_exists(PK)',
    })
  );

  // Fetch and return updated story
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `STORY#${storyId}`,
      }),
    })
  );

  if (!result.Item) {
    throw new Error('Story not found');
  }

  return unmarshall(result.Item);
}

async function deleteStory(event: AppSyncEvent, logger: Logger) {
  const { roomId, storyId } = event.arguments;

  logger.info('story.delete', { roomId, storyId });

  await dynamodb.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `STORY#${storyId}`,
      }),
    })
  );

  return true;
}

async function getStory(event: AppSyncEvent, logger: Logger) {
  const { roomId, storyId } = event.arguments;

  logger.info('story.get', { roomId, storyId });

  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `STORY#${storyId}`,
      }),
    })
  );

  if (!result.Item) {
    return null;
  }

  return unmarshall(result.Item);
}

async function listStories(event: AppSyncEvent, logger: Logger) {
  const { roomId, limit = 20, nextToken } = event.arguments;

  logger.info('story.list', { roomId });

  const params: any = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: marshall({
      ':pk': `ROOM#${roomId}`,
      ':sk': 'STORY#',
    }),
    Limit: limit,
  };

  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await dynamodb.send(new QueryCommand(params));

  const items = (result.Items || []).map((item) => unmarshall(item));

  return {
    items,
    nextToken: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null,
  };
}

// ============================================================================
// VOTING MUTATIONS
// ============================================================================

async function castVote(event: AppSyncEvent, logger: Logger) {
  const { roomId, storyId, value } = event.arguments;
  const userId = userIdOf(event);
  const now = timestamp();

  // Validate vote value
  if (!ALLOWED_VOTES.includes(value)) {
    throw new Error(`Invalid vote value. Allowed: ${ALLOWED_VOTES.join(', ')}`);
  }

  logger.info('vote.cast', { roomId, storyId, value });

  // Upsert vote record
  await dynamodb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        PK: `ROOM#${roomId}`,
        SK: `VOTE#${storyId}#${userId}`,
        userId,
        storyId,
        roomId,
        value,
        createdAt: now,
      }),
    })
  );

  return {
    userId,
    storyId,
    roomId,
    value,
    createdAt: now,
  };
}

async function retractVote(event: AppSyncEvent, logger: Logger) {
  const { roomId, storyId } = event.arguments;
  const userId = userIdOf(event);

  logger.info('vote.retract', { roomId, storyId });

  await dynamodb.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `VOTE#${storyId}#${userId}`,
      }),
    })
  );

  return true;
}

async function revealVotes(event: AppSyncEvent, logger: Logger) {
  const { roomId, storyId } = event.arguments;
  const userId = userIdOf(event);

  // Check if user is moderator
  const role = await getUserRole(roomId, userId);
  if (role !== 'MODERATOR') {
    throw new Error('Only the moderator can reveal votes.');
  }

  logger.info('vote.reveal', { roomId, storyId });

  const now = timestamp();

  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `STORY#${storyId}`,
      }),
      UpdateExpression: 'SET revealed = :revealed, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':revealed': true,
        ':updatedAt': now,
      }),
      ConditionExpression: 'attribute_exists(PK)',
    })
  );

  // Fetch and return updated story
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `STORY#${storyId}`,
      }),
    })
  );

  if (!result.Item) {
    throw new Error('Story not found');
  }

  return unmarshall(result.Item);
}

// ============================================================================
// RETRO MUTATIONS
// ============================================================================

async function addRetroNote(event: AppSyncEvent, logger: Logger) {
  const { roomId, category, text } = event.arguments;
  const userId = userIdOf(event);
  const noteId = randomUUID();
  const now = timestamp();

  // Validate category
  const validCategories = ['WENT_WELL', 'TO_IMPROVE', 'ACTION_ITEMS'];
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  // Validate text
  if (!text || text.trim().length === 0) {
    throw new Error('Retro note text cannot be empty');
  }

  logger.info('retro.add', { roomId, noteId, category });

  await dynamodb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        PK: `ROOM#${roomId}`,
        SK: `RETRO#${noteId}`,
        id: noteId,
        roomId,
        category,
        text,
        authorId: userId,
        votes: 0,
        createdAt: now,
      }),
    })
  );

  return {
    id: noteId,
    roomId,
    category,
    text,
    authorId: userId,
    votes: 0,
    createdAt: now,
  };
}

async function voteRetroNote(event: AppSyncEvent, logger: Logger) {
  const { roomId, noteId, delta } = event.arguments;

  logger.info('retro.vote', { roomId, noteId, delta });

  // Use atomic ADD operation for vote delta
  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `RETRO#${noteId}`,
      }),
      UpdateExpression: 'ADD votes :delta',
      ExpressionAttributeValues: marshall({
        ':delta': delta,
      }),
      ConditionExpression: 'attribute_exists(PK)',
    })
  );

  // Fetch and return updated retro note
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `RETRO#${noteId}`,
      }),
    })
  );

  if (!result.Item) {
    throw new Error('Retro note not found');
  }

  return unmarshall(result.Item);
}

async function listRetro(event: AppSyncEvent, logger: Logger) {
  const { roomId, limit = 50, nextToken } = event.arguments;

  logger.info('retro.list', { roomId });

  const params: any = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: marshall({
      ':pk': `ROOM#${roomId}`,
      ':sk': 'RETRO#',
    }),
    Limit: limit,
  };

  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await dynamodb.send(new QueryCommand(params));

  const items = (result.Items || []).map((item) => unmarshall(item));

  return {
    items,
    nextToken: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null,
  };
}

// ============================================================================
// PRESENCE MUTATIONS
// ============================================================================

async function setPresence(event: AppSyncEvent, logger: Logger) {
  const { roomId, state = 'ONLINE' } = event.arguments;
  const userId = userIdOf(event);
  const now = timestamp();
  const ttl = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

  logger.info('presence.set', { roomId, state });

  // Update presence with fresh TTL
  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `PRES#${userId}`,
      }),
      UpdateExpression: 'SET #state = :state, lastSeen = :lastSeen, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#state': 'state',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: marshall({
        ':state': state,
        ':lastSeen': now,
        ':ttl': ttl,
      }),
      ConditionExpression: 'attribute_exists(PK)',
    })
  );

  // Fetch and return updated presence
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${roomId}`,
        SK: `PRES#${userId}`,
      }),
    })
  );

  if (!result.Item) {
    throw new Error('Presence not found. Please join the room first.');
  }

  return unmarshall(result.Item);
}

async function listPresence(event: AppSyncEvent, logger: Logger) {
  const { roomId } = event.arguments;

  logger.info('presence.list', { roomId });

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `ROOM#${roomId}`,
        ':sk': 'PRES#',
      }),
    })
  );

  return (result.Items || []).map((item) => unmarshall(item));
}

async function getRoom(event: AppSyncEvent, logger: Logger) {
  const { id } = event.arguments;

  logger.info('room.get', { id });

  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `ROOM#${id}`,
        SK: `ROOM#${id}`,
      }),
    })
  );

  if (!result.Item) {
    return null;
  }

  return unmarshall(result.Item);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler = async (event: AppSyncEvent): Promise<any> => {
  const logger = createLogger(event);
  const fieldName = event.info.fieldName;
  const startTime = Date.now();

  logger.info('resolver.start', { fieldName });

  try {
    let result: any;

    // Route to appropriate resolver function
    switch (fieldName) {
      // Room mutations
      case 'createRoom':
        result = await createRoom(event, logger);
        break;
      case 'setRoomStage':
        result = await setRoomStage(event, logger);
        break;
      case 'joinRoom':
        result = await joinRoom(event, logger);
        break;
      case 'leaveRoom':
        result = await leaveRoom(event, logger);
        break;

      // Room queries
      case 'getRoom':
        result = await getRoom(event, logger);
        break;
      case 'getRoomByCode':
        result = await getRoomByCode(event, logger);
        break;
      case 'listRooms':
        result = await listRooms(event, logger);
        break;

      // Story mutations
      case 'createStory':
        result = await createStory(event, logger);
        break;
      case 'updateStory':
        result = await updateStory(event, logger);
        break;
      case 'deleteStory':
        result = await deleteStory(event, logger);
        break;

      // Story queries
      case 'getStory':
        result = await getStory(event, logger);
        break;
      case 'listStories':
        result = await listStories(event, logger);
        break;

      // Voting mutations
      case 'castVote':
        result = await castVote(event, logger);
        break;
      case 'retractVote':
        result = await retractVote(event, logger);
        break;
      case 'revealVotes':
        result = await revealVotes(event, logger);
        break;

      // Retro mutations
      case 'addRetroNote':
        result = await addRetroNote(event, logger);
        break;
      case 'voteRetroNote':
        result = await voteRetroNote(event, logger);
        break;

      // Retro queries
      case 'listRetro':
        result = await listRetro(event, logger);
        break;

      // Presence mutations
      case 'setPresence':
        result = await setPresence(event, logger);
        break;

      // Presence queries
      case 'listPresence':
        result = await listPresence(event, logger);
        break;

      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }

    // Emit success metric for non-joinRoom operations (joinRoom has its own metrics)
    if (fieldName !== 'joinRoom') {
      const latency = Date.now() - startTime;
      await emitMetric('MutationLatency', latency, 'Milliseconds', { Operation: fieldName });
    }

    return result;
  } catch (error: any) {
    logger.error('resolver.error', {
      fieldName,
      error: error.message,
      stack: error.stack,
    });

    // Return user-friendly error messages
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

