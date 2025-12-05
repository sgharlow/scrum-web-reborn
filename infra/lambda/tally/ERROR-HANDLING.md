# Tally Processor Error Handling & Retry Strategy

## Overview

The tally processor Lambda function is configured with robust error handling and retry logic to ensure reliable vote aggregate computation even in the face of transient failures.

## Configuration

### Event Source Mapping

- **Batch Size**: 50 records per invocation
- **Starting Position**: LATEST (only process new events)
- **Retry Attempts**: 3 maximum retries
- **Bisect on Error**: Enabled (splits failed batches in half)
- **Dead Letter Queue**: Failed batches after 3 retries

### Dead Letter Queue (DLQ)

- **Queue Name**: `scrum-reborn-tally-dlq`
- **Retention Period**: 14 days
- **Purpose**: Capture failed batches for manual investigation and replay

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│ DynamoDB Stream Event (Batch of 50 records)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Lambda Invocation #1                                        │
│ - Process each record                                       │
│ - If ANY record fails → throw error                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ Success → Done ✓
                     │
                     └─ Failure ↓
                        
┌─────────────────────────────────────────────────────────────┐
│ Retry #1 (Automatic)                                        │
│ - Same batch, same records                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ Success → Done ✓
                     │
                     └─ Failure ↓
                        
┌─────────────────────────────────────────────────────────────┐
│ Bisect Batch (Split in half)                                │
│ - Batch A: Records 1-25                                     │
│ - Batch B: Records 26-50                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ Process Batch A
                     │  ├─ Success → Done ✓
                     │  └─ Failure → Retry #2 → Bisect again
                     │
                     └─ Process Batch B
                        ├─ Success → Done ✓
                        └─ Failure → Retry #3 → DLQ
```

## Structured Logging

All errors are logged with structured context for debugging:

```json
{
  "level": "ERROR",
  "message": "vote.tally.failed",
  "roomId": "abc-123",
  "storyId": "xyz-456",
  "latency_ms": 1234,
  "error": "ConditionalCheckFailedException",
  "errorCode": "ConditionalCheckFailedException",
  "stack": "..."
}
```

### Log Events

- `tally.batch.start` - Batch processing started
- `vote.tally.start` - Individual vote event processing started
- `votes.query.page` - Querying votes with pagination
- `votes.queried` - All votes retrieved
- `aggregates.computed` - Vote aggregates calculated
- `story.updated` - Story record updated with aggregates
- `vote.tally.complete` - Vote event processed successfully
- `vote.tally.failed` - Vote event processing failed
- `vote.tally.record_error` - Individual record error
- `tally.batch.complete` - Batch processing completed

## Idempotency

The tally processor is **idempotent** - it recomputes vote aggregates from the current state rather than incrementally updating them. This means:

- ✅ Safe to replay events multiple times
- ✅ Duplicate events in the same batch are deduplicated by `storyKey`
- ✅ No risk of double-counting votes

## Monitoring

### CloudWatch Metrics

Monitor these metrics to track error rates:

- `Lambda.Errors` - Total invocation errors
- `Lambda.Duration` - Processing latency (target: <2s p95)
- `DynamoDB.UserErrors` - DynamoDB client errors
- `SQS.NumberOfMessagesSent` (DLQ) - Failed batches

### Alarms

Recommended CloudWatch alarms:

1. **High Error Rate**: >10 errors in 5 minutes
2. **DLQ Messages**: >0 messages in DLQ (investigate immediately)
3. **High Latency**: p95 >2000ms

### DLQ Investigation

When messages appear in the DLQ:

1. Check CloudWatch Logs for error context
2. Identify the failing record(s) from the batch
3. Investigate root cause (DynamoDB throttling, data corruption, etc.)
4. Fix the issue
5. Replay the failed batch manually if needed

## Common Failure Scenarios

### Transient Failures (Auto-Retry)

- **DynamoDB Throttling**: Automatic exponential backoff
- **Network Timeouts**: Retry with fresh connection
- **Lambda Cold Start**: Retry after warm-up

### Terminal Failures (DLQ)

- **Data Corruption**: Invalid vote value or missing fields
- **Permission Errors**: IAM role misconfiguration
- **Table Not Found**: DynamoDB table deleted

## Performance Targets

- **Latency**: <2s p95 from vote cast to aggregate update
- **Success Rate**: >99.9% (excluding DLQ)
- **Batch Processing**: <30s timeout (configured)

## Future Enhancements

- [ ] Partial batch failure reporting (reportBatchItemFailures: true)
- [ ] Custom retry logic with exponential backoff
- [ ] Automatic DLQ replay on transient error resolution
- [ ] Dead letter queue monitoring dashboard
