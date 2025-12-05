/**
 * Mock utilities for AWS SDK clients
 * Provides mock implementations for DynamoDB and CloudWatch clients
 */

import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

/**
 * Create a mock DynamoDB client
 */
export const createMockDynamoDBClient = () => {
  return mockClient(DynamoDBClient);
};

/**
 * Create a mock CloudWatch client
 */
export const createMockCloudWatchClient = () => {
  return mockClient(CloudWatchClient);
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
};
