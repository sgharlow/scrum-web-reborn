import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// ============================================================================
// TALLY PROCESSOR - ERROR HANDLING & RETRY STRATEGY
// ============================================================================
//
// This Lambda function processes DynamoDB Stream events to compute vote
// aggregates (voteCount, avgVote) for stories in real-time.
//
// ERROR HANDLING:
// - All errors are logged with structured context (roomId, storyId, error details)
// - Errors in individual records cause the entire batch to fail (throw error)
// - Failed batches are automatically retried by Lambda event source mapping
//
// RETRY CONFIGURATION (configured in CDK stack):
// - Maximum retry attempts: 3
// - Batch failure handling: bisectBatchOnError (splits batch in half on failure)
// - Dead Letter Queue: Failed batches after 3 retries go to DLQ for investigation
//
// IDEMPOTENCY:
// - Vote tallies are recomputed from current state (not incremental)
// - Safe to replay events multiple times
// - Duplicate events in same batch are deduplicated by storyKey
//
// PERFORMANCE:
// - Target: <2s p95 latency from vote cast to aggregate update
// - Batch size: 50 records (configured in event source mapping)
// - Query pagination: 100 votes per page
//
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

interface DynamoDBRecord {
  eventID: string;
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  dynamodb?: {
    Keys?: Record<string, any>;
    NewImage?: Record<string, any>;
    OldImage?: Record<string, any>;
    SequenceNumber?: string;
    SizeBytes?: number;
    StreamViewType?: string;
  };
  eventSourceARN?: string;
}

interface DynamoDBStreamEvent {
  Records: DynamoDBRecord[];
}

interface Logger {
  info: (message: string, context?: Record<string, any>) => void;
  error: (message: string, context?: Record<string, any>) => void;
  warn: (message: string, context?: Record<string, any>) => void;
}

interface VoteRecord {
  userId: string;
  storyId: string;
  roomId: string;
  value: string;
  createdAt: string;
}

interface VoteAggregates {
  voteCount: number;
  avgVote: number | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_NAME = process.env.TABLE_NAME || 'ScrumRealtimeTable';
const SPECIAL_CARDS = ['☕', '❓'];
const NAMESPACE = 'ScrumReborn';

const dynamodb = new DynamoDBClient({});
const cloudwatch = new CloudWatchClient({});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create structured logger
 */
function createLogger(): Logger {
  return {
    info: (message: string, extra?: Record<string, any>) => {
      console.log(JSON.stringify({ level: 'INFO', message, ...extra }));
    },
    error: (message: string, extra?: Record<string, any>) => {
      console.error(JSON.stringify({ level: 'ERROR', message, ...extra }));
    },
    warn: (message: string, extra?: Record<string, any>) => {
      console.warn(JSON.stringify({ level: 'WARN', message, ...extra }));
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
 * Extract roomId and storyId from DynamoDB record
 */
function extractIds(record: DynamoDBRecord): { roomId: string; storyId: string } | null {
  // For REMOVE events, use OldImage; for INSERT/MODIFY, use NewImage
  const image = record.dynamodb?.NewImage || record.dynamodb?.OldImage;
  if (!image) {
    return null;
  }

  // Unmarshall the DynamoDB record to get proper types
  const item = unmarshall(image);

  // Extract from PK and SK
  const pk = item.PK as string;
  const sk = item.SK as string;

  // Filter for VOTE# records only
  if (!sk || !sk.startsWith('VOTE#')) {
    return null;
  }

  // Extract roomId from PK: ROOM#<roomId>
  const roomId = pk.replace('ROOM#', '');

  // Extract storyId from SK: VOTE#<storyId>#<userId>
  const skParts = sk.split('#');
  if (skParts.length < 2) {
    return null;
  }
  const storyId = skParts[1];

  return { roomId, storyId };
}

/**
 * Query all votes for a story with pagination
 */
async function queryAllVotes(
  roomId: string,
  storyId: string,
  logger: Logger
): Promise<VoteRecord[]> {
  const votes: VoteRecord[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;
  let pageCount = 0;

  try {
    do {
      pageCount++;
      const params: any = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': `ROOM#${roomId}`,
          ':sk': `VOTE#${storyId}#`,
        }),
        Limit: 100,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      logger.info('votes.query.page', {
        roomId,
        storyId,
        pageNumber: pageCount,
        hasMorePages: !!lastEvaluatedKey,
      });

      const result = await dynamodb.send(new QueryCommand(params));

      if (result.Items) {
        for (const item of result.Items) {
          const vote = unmarshall(item) as VoteRecord;
          votes.push(vote);
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    logger.info('votes.queried', {
      roomId,
      storyId,
      count: votes.length,
      pages: pageCount,
    });

    return votes;
  } catch (error: any) {
    logger.error('votes.query.failed', {
      roomId,
      storyId,
      error: error.message,
      errorCode: error.code,
      pageCount,
      votesCollected: votes.length,
    });
    throw error;
  }
}

/**
 * Compute vote aggregates from vote records
 */
function computeAggregates(votes: VoteRecord[], logger: Logger): VoteAggregates {
  const voteCount = votes.length;

  // Filter out special cards and parse numeric values
  const numericVotes = votes
    .map((v) => v.value)
    .filter((value) => !SPECIAL_CARDS.includes(value))
    .map((value) => parseFloat(value))
    .filter((value) => !isNaN(value));

  // Calculate average, or null if no numeric votes
  const avgVote =
    numericVotes.length > 0
      ? numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length
      : null;

  logger.info('aggregates.computed', {
    voteCount,
    numericCount: numericVotes.length,
    avgVote,
  });

  return { voteCount, avgVote };
}

/**
 * Update story record with computed aggregates
 */
async function updateStoryAggregates(
  roomId: string,
  storyId: string,
  aggregates: VoteAggregates,
  logger: Logger
): Promise<void> {
  const now = new Date().toISOString();

  try {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `ROOM#${roomId}`,
          SK: `STORY#${storyId}`,
        }),
        UpdateExpression: 'SET voteCount = :voteCount, avgVote = :avgVote, updatedAt = :updatedAt',
        ExpressionAttributeValues: marshall({
          ':voteCount': aggregates.voteCount,
          ':avgVote': aggregates.avgVote,
          ':updatedAt': now,
        }),
      })
    );

    logger.info('story.updated', {
      roomId,
      storyId,
      voteCount: aggregates.voteCount,
      avgVote: aggregates.avgVote,
      updatedAt: now,
    });
  } catch (error: any) {
    logger.error('story.update.failed', {
      roomId,
      storyId,
      error: error.message,
      errorCode: error.code,
      aggregates,
    });
    throw error;
  }
}

/**
 * Process a single vote change event
 */
async function processVoteEvent(
  roomId: string,
  storyId: string,
  logger: Logger
): Promise<void> {
  const startTime = Date.now();

  try {
    // Query all votes for the story
    const votes = await queryAllVotes(roomId, storyId, logger);

    // Compute aggregates
    const aggregates = computeAggregates(votes, logger);

    // Update story with new aggregates
    await updateStoryAggregates(roomId, storyId, aggregates, logger);

    const latency = Date.now() - startTime;
    logger.info('vote.tally.complete', { roomId, storyId, latency_ms: latency });

    // Emit tally latency metric
    await emitMetric('VoteTallyLatency', latency, 'Milliseconds', { Operation: 'voteTally' });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error('vote.tally.failed', {
      roomId,
      storyId,
      latency_ms: latency,
      error: error.message,
      errorCode: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  const logger = createLogger();
  const batchStartTime = Date.now();

  logger.info('tally.batch.start', {
    recordCount: event.Records.length,
    timestamp: new Date().toISOString(),
  });

  // Process each record in the batch
  const processedStories = new Set<string>();
  const errors: Array<{ recordId: string; error: string }> = [];

  for (const record of event.Records) {
    try {
      // Extract roomId and storyId from the record
      const ids = extractIds(record);

      if (!ids) {
        // Not a vote record, skip
        logger.info('tally.record.skip', {
          eventId: record.eventID,
          reason: 'not_a_vote_record',
        });
        continue;
      }

      const { roomId, storyId } = ids;
      const storyKey = `${roomId}#${storyId}`;

      // Skip if we've already processed this story in this batch
      if (processedStories.has(storyKey)) {
        logger.info('vote.tally.skip_duplicate', {
          roomId,
          storyId,
          eventId: record.eventID,
        });
        continue;
      }

      logger.info('vote.tally.start', {
        roomId,
        storyId,
        eventId: record.eventID,
        eventName: record.eventName,
        sequenceNumber: record.dynamodb?.SequenceNumber,
      });

      // Process the vote event
      await processVoteEvent(roomId, storyId, logger);

      // Mark as processed
      processedStories.add(storyKey);
    } catch (error: any) {
      const errorContext = {
        eventId: record.eventID,
        eventName: record.eventName,
        error: error.message,
        errorCode: error.code,
        errorName: error.name,
        stack: error.stack,
        sequenceNumber: record.dynamodb?.SequenceNumber,
      };

      logger.error('vote.tally.record_error', errorContext);
      errors.push({
        recordId: record.eventID,
        error: error.message,
      });

      // Re-throw to trigger retry/DLQ
      // This will cause the entire batch to fail and retry
      throw error;
    }
  }

  const batchLatency = Date.now() - batchStartTime;

  logger.info('tally.batch.complete', {
    processedCount: processedStories.size,
    totalRecords: event.Records.length,
    errorCount: errors.length,
    latency_ms: batchLatency,
    timestamp: new Date().toISOString(),
  });

  // If there were any errors, they would have been thrown above
  // This ensures the batch is marked as failed for retry/DLQ
};
