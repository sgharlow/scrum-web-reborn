# Tally Processor Lambda - Error Handling & Retry Configuration

## Overview

The tally processor Lambda function computes vote aggregates (voteCount, avgVote) in real-time by processing DynamoDB Stream events.

## Error Handling Strategy

### Structured Logging

All operations emit structured JSON logs with context:

```typescript
{
  "level": "INFO|ERROR|WARN",
  "message": "vote.tally.complete",
  "roomId": "abc-123",
  "storyId": "xyz-456",
  "latency_ms": 234,
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

### Error Propagation

- Errors in individual records cause the entire batch to fail
- Failed batches are automatically retried by Lambda event source mapping
- After max retries, failed batches are sent to Dead Letter Queue (DLQ)

### Idempotency

- Vote tallies are recomputed from current state (not incremental)
- Safe to replay events multiple times
- Duplicate events in same batch are deduplicated by storyKey

## CDK Configuration (Task 6)

When wiring the tally Lambda to the CDK stack, use the following configuration:

### Dead Letter Queue

```typescript
import * as sqs from 'aws-cdk-lib/aws-sqs';

const tallyDLQ = new sqs.Queue(this, 'TallyProcessorDLQ', {
  queueName: 'scrum-reborn-tally-dlq',
  retentionPeriod: cdk.Duration.days(14),
  visibilityTimeout: cdk.Duration.seconds(300),
});
```

### Event Source Mapping

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

tallyFunction.addEventSource(
  new DynamoEventSource(this.table, {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 50,
    maxBatchingWindow: cdk.Duration.seconds(5),
    bisectBatchOnError: true,
    retryAttempts: 3,
    onFailure: new SqsDlq(tallyDLQ),
    filters: [
      lambda.FilterCriteria.filter({
        eventName: lambda.FilterRule.isEqual('INSERT'),
        dynamodb: {
          NewImage: {
            SK: {
              S: lambda.FilterRule.beginsWith('VOTE#'),
            },
          },
        },
      }),
      lambda.FilterCriteria.filter({
        eventName: lambda.FilterRule.isEqual('MODIFY'),
        dynamodb: {
          NewImage: {
            SK: {
              S: lambda.FilterRule.beginsWith('VOTE#'),
            },
          },
        },
      }),
      lambda.FilterCriteria.filter({
        eventName: lambda.FilterRule.isEqual('REMOVE'),
        dynamodb: {
          OldImage: {
            SK: {
              S: lambda.FilterRule.beginsWith('VOTE#'),
            },
          },
        },
      }),
    ],
  })
);
```

### Configuration Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `batchSize` | 50 | Balance between throughput and latency |
| `maxBatchingWindow` | 5s | Don't wait too long to process votes |
| `bisectBatchOnError` | true | Split failed batches to isolate poison pills |
| `retryAttempts` | 3 | Retry transient errors (throttling, timeouts) |
| `onFailure` | DLQ | Capture failed batches for investigation |
| `filters` | VOTE# only | Only process vote events, skip other entities |

## Monitoring

### Key Metrics

- `vote.tally.complete` - Successful tally updates
- `vote.tally.failed` - Failed tally updates
- `tally.batch.complete` - Batch processing summary
- `latency_ms` - Time from event to aggregate update

### CloudWatch Insights Queries

**Average tally latency:**
```
fields @timestamp, latency_ms
| filter message = "vote.tally.complete"
| stats avg(latency_ms) as avg_latency, pct(latency_ms, 95) as p95_latency by bin(5m)
```

**Error rate:**
```
fields @timestamp, error, roomId, storyId
| filter level = "ERROR"
| stats count() as error_count by bin(5m)
```

**DLQ messages (requires manual inspection):**
```bash
aws sqs receive-message \
  --queue-url <DLQ_URL> \
  --max-number-of-messages 10 \
  --visibility-timeout 300
```

## Troubleshooting

### High Error Rate

1. Check CloudWatch Logs for error patterns
2. Verify DynamoDB table is not throttled
3. Check if story records exist (update might fail if story deleted)

### DLQ Messages

1. Retrieve messages from DLQ
2. Inspect event payload for data issues
3. Fix root cause (e.g., invalid data, missing records)
4. Manually replay events if needed

### Slow Tally Updates

1. Check if pagination is hitting 100+ votes per story
2. Consider increasing Lambda memory (more CPU)
3. Monitor DynamoDB read capacity

## Performance Targets

- **Latency p95**: <2s from vote cast to aggregate update
- **Error rate**: <0.1% of batches
- **DLQ messages**: 0 under normal operation

## Requirements Satisfied

- **4.5**: Idempotent processing with retry logic
- **4.6**: Dead Letter Queue for failed batches after 3 retries
