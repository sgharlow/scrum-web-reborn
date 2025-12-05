/**
 * Unit tests for tally Lambda function
 * Tests vote aggregation, average calculation, DynamoDB Streams processing, and error handling
 */

// Mock AWS SDK clients BEFORE any imports
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/util-dynamodb');
  return {
    ...actual,
    DynamoDBClient: jest.fn(() => ({
      send: mockSend,
    })),
    QueryCommand: jest.fn((input) => ({ input })),
    UpdateItemCommand: jest.fn((input) => ({ input })),
  };
});

jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutMetricDataCommand: jest.fn((input) => ({ input })),
}));

import { marshall } from '@aws-sdk/util-dynamodb';
import { createMockStreamEvent } from '../../__tests__/fixtures';
import { handler } from '../index';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('Tally Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Vote Aggregation', () => {
    it('should compute correct average for numeric votes', async () => {
      const event = {
        Records: [createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-3', '8')],
      };

      // Mock query - three numeric votes: 3, 5, 8
      mockSend.mockResolvedValueOnce({
        Items: [
          marshall({ userId: 'user-1', value: '3' }),
          marshall({ userId: 'user-2', value: '5' }),
          marshall({ userId: 'user-3', value: '8' }),
        ],
      });

      // Mock update
      mockSend.mockResolvedValueOnce({});

      await handler(event);

      // Verify update was called with correct aggregates
      expect(mockSend).toHaveBeenCalledTimes(2); // Query + Update
      const updateCall = mockSend.mock.calls[1][0];
      const values = updateCall.input.ExpressionAttributeValues;
      
      expect(values[':voteCount'].N).toBe('3');
      // Average of 3, 5, 8 = 5.333...
      expect(parseFloat(values[':avgVote'].N)).toBeCloseTo(5.33, 1);
    });

    it('should exclude special cards from average calculation', async () => {
      const event = {
        Records: [createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-4', '☕')],
      };

      // Mock query - mix of numeric and special cards
      mockSend.mockResolvedValueOnce({
        Items: [
          marshall({ userId: 'user-1', value: '5' }),
          marshall({ userId: 'user-2', value: '☕' }),
          marshall({ userId: 'user-3', value: '8' }),
          marshall({ userId: 'user-4', value: '❓' }),
        ],
      });

      mockSend.mockResolvedValueOnce({});

      await handler(event);

      const updateCall = mockSend.mock.calls[1][0];
      const values = updateCall.input.ExpressionAttributeValues;

      expect(values[':voteCount'].N).toBe('4');
      // Average of only 5 and 8 = 6.5 (special cards excluded)
      expect(parseFloat(values[':avgVote'].N)).toBe(6.5);
    });

    it('should return null average when all votes are special cards', async () => {
      const event = {
        Records: [createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-2', '❓')],
      };

      // Mock query - only special cards
      mockSend.mockResolvedValueOnce({
        Items: [
          marshall({ userId: 'user-1', value: '☕' }),
          marshall({ userId: 'user-2', value: '❓' }),
        ],
      });

      mockSend.mockResolvedValueOnce({});

      await handler(event);

      const updateCall = mockSend.mock.calls[1][0];
      const values = updateCall.input.ExpressionAttributeValues;

      expect(values[':voteCount'].N).toBe('2');
      expect(values[':avgVote'].NULL).toBe(true);
    });

    it('should handle empty vote list', async () => {
      const event = {
        Records: [createMockStreamEvent('REMOVE', 'room-123', 'story-456', 'user-1')],
      };

      // Mock query - no votes
      mockSend.mockResolvedValueOnce({
        Items: [],
      });

      mockSend.mockResolvedValueOnce({});

      await handler(event);

      // Verify update was called (2 calls: query + update)
      if (mockSend.mock.calls.length !== 2) {
        throw new Error(`Expected 2 calls, got ${mockSend.mock.calls.length}`);
      }
      
      // Check if we have the update call
      const updateCall = mockSend.mock.calls[1][0];
      const values = updateCall.input.ExpressionAttributeValues;

      expect(values[':voteCount'].N).toBe('0');
      expect(values[':avgVote'].NULL).toBe(true);
    });
  });

  describe('DynamoDB Streams Event Processing', () => {
    it('should process INSERT events', async () => {
      const event = {
        Records: [createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-1', '5')],
      };

      mockSend.mockResolvedValueOnce({
        Items: [marshall({ userId: 'user-1', value: '5' })],
      });

      mockSend.mockResolvedValueOnce({});

      await handler(event);

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should process MODIFY events', async () => {
      const event = {
        Records: [createMockStreamEvent('MODIFY', 'room-123', 'story-456', 'user-1', '8')],
      };

      mockSend.mockResolvedValueOnce({
        Items: [marshall({ userId: 'user-1', value: '8' })],
      });

      mockSend.mockResolvedValueOnce({});

      await handler(event);

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should process REMOVE events', async () => {
      const event = {
        Records: [createMockStreamEvent('REMOVE', 'room-123', 'story-456', 'user-1')],
      };

      mockSend.mockResolvedValueOnce({
        Items: [],
      });

      mockSend.mockResolvedValueOnce({});

      await handler(event);

      // Verify both query and update were called
      if (mockSend.mock.calls.length !== 2) {
        throw new Error(`Expected 2 calls, got ${mockSend.mock.calls.length}`);
      }
    });

    it('should deduplicate multiple events for same story', async () => {
      const event = {
        Records: [
          createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-1', '5'),
          createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-2', '8'),
          createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-3', '3'),
        ],
      };

      mockSend.mockResolvedValueOnce({
        Items: [
          marshall({ userId: 'user-1', value: '5' }),
          marshall({ userId: 'user-2', value: '8' }),
          marshall({ userId: 'user-3', value: '3' }),
        ],
      });

      mockSend.mockResolvedValueOnce({});

      await handler(event);

      // Should only query and update once despite 3 events for same story
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error on DynamoDB query failure', async () => {
      const event = {
        Records: [createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-1', '5')],
      };

      mockSend.mockRejectedValueOnce(new Error('DynamoDB query failed'));

      await expect(handler(event)).rejects.toThrow('DynamoDB query failed');
    });

    it('should throw error on story update failure', async () => {
      const event = {
        Records: [createMockStreamEvent('INSERT', 'room-123', 'story-456', 'user-1', '5')],
      };

      mockSend.mockResolvedValueOnce({
        Items: [marshall({ userId: 'user-1', value: '5' })],
      });

      mockSend.mockRejectedValueOnce(new Error('Update failed'));

      await expect(handler(event)).rejects.toThrow('Update failed');
    });
  });
});
