import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  Statistic,
} from '@aws-sdk/client-cloudwatch';

// ============================================================================
// DOMO ETL PIPELINE
// ============================================================================
//
// This Lambda function runs every 15 minutes to:
// 1. Poll CloudWatch metrics for SLI data
// 2. Transform metrics to Domo dataset format
// 3. Push to Domo API
//
// Metrics collected:
// - JoinRoomSuccess/JoinRoomFailure (connectivity success rate)
// - MutationLatency (p50, p95, p99)
// - VoteTallyLatency (p50, p95, p99)
// - ProbeSuccess/ProbeFailure
//
// On failure, messages go to DLQ for manual investigation
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

interface DomoRecord {
  timestamp: string;
  metric_name: string;
  metric_value: number;
  statistic: string;
  unit: string;
}

interface MetricConfig {
  namespace: string;
  metricName: string;
  statistics?: Statistic[];
  extendedStatistics?: string[];
  unit: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DOMO_API_ENDPOINT = process.env.DOMO_API_ENDPOINT || '';
const DOMO_API_TOKEN = process.env.DOMO_API_TOKEN || '';
const DOMO_DATASET_ID = process.env.DOMO_DATASET_ID || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const cloudwatch = new CloudWatchClient({ region: AWS_REGION });

// Metrics to collect
const METRICS: MetricConfig[] = [
  {
    namespace: 'ScrumReborn',
    metricName: 'JoinRoomSuccess',
    statistics: ['Sum'],
    unit: 'Count',
  },
  {
    namespace: 'ScrumReborn',
    metricName: 'JoinRoomFailure',
    statistics: ['Sum'],
    unit: 'Count',
  },
  {
    namespace: 'ScrumReborn',
    metricName: 'MutationLatency',
    statistics: ['Average'],
    extendedStatistics: ['p95', 'p99'],
    unit: 'Milliseconds',
  },
  {
    namespace: 'ScrumReborn',
    metricName: 'VoteTallyLatency',
    statistics: ['Average'],
    extendedStatistics: ['p95', 'p99'],
    unit: 'Milliseconds',
  },
  {
    namespace: 'ScrumReborn',
    metricName: 'ProbeSuccess',
    statistics: ['Sum'],
    unit: 'Count',
  },
  {
    namespace: 'ScrumReborn',
    metricName: 'ProbeFailure',
    statistics: ['Sum'],
    unit: 'Count',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch CloudWatch metric statistics
 */
async function fetchMetricStatistics(
  config: MetricConfig,
  startTime: Date,
  endTime: Date
): Promise<DomoRecord[]> {
  const records: DomoRecord[] = [];

  // Fetch standard statistics
  if (config.statistics) {
    for (const statistic of config.statistics) {
      try {
        const result = await cloudwatch.send(
          new GetMetricStatisticsCommand({
            Namespace: config.namespace,
            MetricName: config.metricName,
            StartTime: startTime,
            EndTime: endTime,
            Period: 900, // 15 minutes
            Statistics: [statistic],
          })
        );

        if (result.Datapoints && result.Datapoints.length > 0) {
          for (const datapoint of result.Datapoints) {
            const value =
              statistic === 'Sum'
                ? datapoint.Sum
                : statistic === 'Average'
                ? datapoint.Average
                : statistic === 'Maximum'
                ? datapoint.Maximum
                : statistic === 'Minimum'
                ? datapoint.Minimum
                : datapoint.SampleCount;

            if (value !== undefined && datapoint.Timestamp) {
              records.push({
                timestamp: datapoint.Timestamp.toISOString(),
                metric_name: config.metricName,
                metric_value: value,
                statistic: statistic,
                unit: config.unit,
              });
            }
          }
        }

        console.log(
          `Fetched ${result.Datapoints?.length || 0} datapoints for ${
            config.metricName
          } (${statistic})`
        );
      } catch (error: any) {
        console.error(
          `Failed to fetch metric ${config.metricName} (${statistic}):`,
          error.message
        );
      }
    }
  }

  // Fetch extended statistics (p95, p99, etc.)
  if (config.extendedStatistics) {
    try {
      const result = await cloudwatch.send(
        new GetMetricStatisticsCommand({
          Namespace: config.namespace,
          MetricName: config.metricName,
          StartTime: startTime,
          EndTime: endTime,
          Period: 900, // 15 minutes
          ExtendedStatistics: config.extendedStatistics,
        })
      );

      if (result.Datapoints && result.Datapoints.length > 0) {
        for (const datapoint of result.Datapoints) {
          if (datapoint.ExtendedStatistics && datapoint.Timestamp) {
            for (const [stat, value] of Object.entries(
              datapoint.ExtendedStatistics
            )) {
              if (value !== undefined) {
                records.push({
                  timestamp: datapoint.Timestamp.toISOString(),
                  metric_name: config.metricName,
                  metric_value: value,
                  statistic: stat,
                  unit: config.unit,
                });
              }
            }
          }
        }
      }

      console.log(
        `Fetched ${result.Datapoints?.length || 0} datapoints for ${
          config.metricName
        } (extended statistics)`
      );
    } catch (error: any) {
      console.error(
        `Failed to fetch extended statistics for ${config.metricName}:`,
        error.message
      );
    }
  }

  return records;
}

/**
 * Push records to Domo API
 */
async function pushToDomo(records: DomoRecord[]): Promise<void> {
  if (!DOMO_API_ENDPOINT || !DOMO_API_TOKEN || !DOMO_DATASET_ID) {
    console.warn(
      'Domo API credentials not configured. Skipping push. Records:',
      JSON.stringify(records, null, 2)
    );
    return;
  }

  if (records.length === 0) {
    console.log('No records to push to Domo');
    return;
  }

  try {
    const response = await fetch(
      `${DOMO_API_ENDPOINT}/v1/datasets/${DOMO_DATASET_ID}/data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DOMO_API_TOKEN}`,
        },
        body: JSON.stringify(records),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Domo API error: ${response.status} - ${errorText}`);
    }

    console.log(`Successfully pushed ${records.length} records to Domo`);
  } catch (error: any) {
    console.error('Failed to push to Domo:', error.message);
    throw error;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler = async (): Promise<void> => {
  console.log('🔄 Starting Domo ETL pipeline...');

  // Fetch metrics for the last 15 minutes
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 15 * 60 * 1000);

  console.log(
    `Fetching metrics from ${startTime.toISOString()} to ${endTime.toISOString()}`
  );

  const allRecords: DomoRecord[] = [];

  // Fetch all metrics
  for (const metricConfig of METRICS) {
    const records = await fetchMetricStatistics(metricConfig, startTime, endTime);
    allRecords.push(...records);
  }

  console.log(`Collected ${allRecords.length} total records`);

  // Push to Domo
  await pushToDomo(allRecords);

  console.log('✓ Domo ETL pipeline completed successfully');
};
