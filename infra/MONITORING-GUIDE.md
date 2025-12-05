# Monitoring and Observability Guide

## Overview

This document describes the monitoring and observability infrastructure for Scrum Reborn, including CloudWatch metrics, alarms, synthetic probes, and Domo ETL integration.

## CloudWatch Custom Metrics

### Namespace

All custom metrics are published to the `ScrumReborn` namespace.

### Metrics Emitted

#### Mutations Lambda

- **JoinRoomSuccess** (Count): Successful room join operations
- **JoinRoomFailure** (Count): Failed room join operations
- **MutationLatency** (Milliseconds): Latency for all mutations and queries
  - Dimensions: `Operation` (e.g., `joinRoom`, `createStory`, `castVote`)

#### Tally Processor Lambda

- **VoteTallyLatency** (Milliseconds): Time to compute and update vote aggregates
  - Dimensions: `Operation=voteTally`

#### Synthetic Probe Lambda

- **ProbeSuccess** (Count): Successful E2E probe executions
- **ProbeFailure** (Count): Failed E2E probe executions
- **ProbeLatency** (Milliseconds): Total E2E probe execution time
- **ConnectivitySuccess** (Count): Successful connectivity tests

## CloudWatch Alarms

### High Error Rate Alarm

- **Name**: `ScrumReborn-HighErrorRate`
- **Metric**: `AWS/Lambda` → `Errors` (Mutations Lambda)
- **Threshold**: >10 errors in 5 minutes
- **Action**: Sends notification to SNS topic

### High Latency Alarm

- **Name**: `ScrumReborn-HighLatency`
- **Metric**: `ScrumReborn` → `MutationLatency` (p95)
- **Threshold**: >500ms
- **Evaluation**: 2 consecutive periods of 5 minutes
- **Action**: Sends notification to SNS topic

### DynamoDB Throttling Alarm

- **Name**: `ScrumReborn-DynamoDBThrottling`
- **Metric**: `AWS/DynamoDB` → `UserErrors`
- **Threshold**: >0 in 1 minute
- **Action**: Sends notification to SNS topic

### Tally High Latency Alarm

- **Name**: `ScrumReborn-TallyHighLatency`
- **Metric**: `ScrumReborn` → `VoteTallyLatency` (p95)
- **Threshold**: >2000ms (2 seconds)
- **Evaluation**: 2 consecutive periods of 5 minutes
- **Action**: Sends notification to SNS topic

### Probe Failure Alarm

- **Name**: `ScrumReborn-ProbeFailure`
- **Metric**: `ScrumReborn` → `ProbeFailure`
- **Threshold**: >0 in 1 hour
- **Action**: Sends notification to SNS topic

## SNS Topic for Alarms

- **Topic Name**: `scrum-reborn-alarms`
- **Purpose**: Receives all CloudWatch alarm notifications
- **Configuration**: Subscribe email addresses or Slack webhooks to receive alerts

### Subscribing to Alarms

```bash
# Subscribe an email address
aws sns subscribe \
  --topic-arn <AlarmTopicArn from stack outputs> \
  --protocol email \
  --notification-endpoint your-email@example.com

# Subscribe a Slack webhook (via Lambda)
# See AWS documentation for SNS to Slack integration
```

## Synthetic Probe

### Purpose

The synthetic probe runs a full E2E test flow daily to verify system health:

1. Create test user (or sign in)
2. Create room
3. Join room
4. Create story
5. Cast vote
6. Reveal votes
7. Verify vote tally updated

### Schedule

- **Frequency**: Daily at 07:00 UTC
- **Timeout**: 60 seconds
- **Function**: `scrum-reborn-synthetic-probe`

### Metrics

- **ProbeSuccess/ProbeFailure**: Overall probe result
- **ProbeLatency**: Total execution time
- **ConnectivitySuccess**: Connectivity test result

### Manual Execution

```bash
# Invoke the probe manually
aws lambda invoke \
  --function-name scrum-reborn-synthetic-probe \
  --payload '{}' \
  response.json

# View the result
cat response.json
```

### Probe Result Format

```json
{
  "success": true,
  "latency": 12345,
  "steps": {
    "auth": { "success": true, "latency": 1234 },
    "createRoom": { "success": true, "latency": 567 },
    "joinRoom": { "success": true, "latency": 234 },
    "createStory": { "success": true, "latency": 345 },
    "castVote": { "success": true, "latency": 456 },
    "revealVotes": { "success": true, "latency": 567 },
    "verifyTally": { "success": true, "latency": 3456 }
  }
}
```

## Domo ETL Pipeline

### Purpose

Polls CloudWatch metrics every 15 minutes and pushes data to Domo for dashboarding and analytics.

### Schedule

- **Frequency**: Every 15 minutes
- **Timeout**: 60 seconds
- **Function**: `scrum-reborn-domo-etl`

### Metrics Collected

- JoinRoomSuccess/JoinRoomFailure (Sum)
- MutationLatency (Average, p95, p99)
- VoteTallyLatency (Average, p95, p99)
- ProbeSuccess/ProbeFailure (Sum)

### Configuration

Set the following environment variables in the Lambda function:

- `DOMO_API_ENDPOINT`: Domo API base URL (e.g., `https://api.domo.com`)
- `DOMO_API_TOKEN`: Domo API access token
- `DOMO_DATASET_ID`: Target Domo dataset ID

### Domo Dataset Schema

```json
{
  "columns": [
    { "name": "timestamp", "type": "DATETIME" },
    { "name": "metric_name", "type": "STRING" },
    { "name": "metric_value", "type": "DOUBLE" },
    { "name": "statistic", "type": "STRING" },
    { "name": "unit", "type": "STRING" }
  ]
}
```

### Error Handling

- Failed ETL runs are sent to the Dead Letter Queue: `scrum-reborn-domo-etl-dlq`
- Messages are retained for 14 days for manual investigation
- Check DLQ regularly for failed pushes

### Manual Execution

```bash
# Invoke the ETL manually
aws lambda invoke \
  --function-name scrum-reborn-domo-etl \
  --payload '{}' \
  response.json

# Check DLQ for failed messages
aws sqs receive-message \
  --queue-url <DomoETLDLQUrl from stack outputs> \
  --max-number-of-messages 10
```

## SLI Dashboard (Domo)

### Key Metrics

1. **Connectivity Success Rate**: `JoinRoomSuccess / (JoinRoomSuccess + JoinRoomFailure)`
   - Target: ≥99.5%

2. **Pub/Sub Latency (p95)**: `MutationLatency` p95
   - Target: ≤250ms

3. **Vote Tally Latency (p95)**: `VoteTallyLatency` p95
   - Target: ≤2s

4. **Presence Freshness**: Time since last heartbeat
   - Target: ≤30s

### Sample Domo Card Queries

#### Connectivity Success Rate (Last 24 Hours)

```sql
SELECT 
  SUM(CASE WHEN metric_name = 'JoinRoomSuccess' THEN metric_value ELSE 0 END) AS successes,
  SUM(CASE WHEN metric_name = 'JoinRoomFailure' THEN metric_value ELSE 0 END) AS failures,
  (successes / (successes + failures)) * 100 AS success_rate
FROM scrum_reborn_metrics
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL 1 DAY
```

#### Mutation Latency Trend (Last 7 Days)

```sql
SELECT 
  DATE(timestamp) AS date,
  AVG(CASE WHEN statistic = 'p95' THEN metric_value END) AS p95_latency
FROM scrum_reborn_metrics
WHERE metric_name = 'MutationLatency'
  AND timestamp >= CURRENT_TIMESTAMP - INTERVAL 7 DAY
GROUP BY DATE(timestamp)
ORDER BY date
```

## Troubleshooting

### High Error Rate

1. Check CloudWatch Logs for the mutations Lambda
2. Look for patterns in error messages
3. Check DynamoDB throttling metrics
4. Verify Cognito User Pool is healthy

### High Latency

1. Check Lambda cold start metrics
2. Review DynamoDB query patterns
3. Check for network issues
4. Consider provisioned concurrency for Lambda

### Probe Failures

1. Check probe Lambda logs for specific step failures
2. Verify GraphQL endpoint is accessible
3. Check Cognito User Pool configuration
4. Manually test the failing step

### Domo ETL Failures

1. Check DLQ for failed messages
2. Verify Domo API credentials
3. Check Domo dataset schema matches expected format
4. Review CloudWatch Logs for ETL Lambda

## Best Practices

1. **Set up SNS subscriptions** for all alarms to receive notifications
2. **Review probe results daily** to catch issues early
3. **Monitor DLQ regularly** to catch failed ETL runs
4. **Create Domo dashboards** for SLI tracking
5. **Set up on-call rotation** for alarm responses
6. **Document incident responses** for future reference

## Additional Resources

- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [AWS Lambda Monitoring](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions.html)
- [Domo API Documentation](https://developer.domo.com/)
- [SLI/SLO Best Practices](https://sre.google/sre-book/service-level-objectives/)

---

**Last Updated**: 2025-11-13
**Version**: 1.0
