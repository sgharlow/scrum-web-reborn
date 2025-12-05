/**
 * Unit tests for mutations Lambda function
 * Tests room code validation, moderator authorization, vote validation, and room operations
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
    PutItemCommand: jest.fn((input) => ({ input })),
    GetItemCommand: jest.fn((input) => ({ input })),
    UpdateItemCommand: jest.fn((input) => ({ input })),
    DeleteItemCommand: jest.fn((input) => ({ input })),
    QueryCommand: jest.fn((input) => ({ input })),
  };
});

jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutMetricDataCommand: jest.fn((input) => ({ input })),
}));

import { marshall } from '@aws-sdk/util-dynamodb';
import { createMockAppSyncEvent } from '../../__tests__/fixtures';
import { handler } from '../index';
import { it } from 'node:test';
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
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('Mutations Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Room Code Validation', () => {
    it('should accept valid 6-character alphanumeric codes', async () => {
      const event = createMockAppSyncEvent('createRoom', {
        name: 'Test Room',
        code: 'ABC123',
      });

      mockSend.mockResolvedValue({});

      const result = await handler(event);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('code', 'ABC123');
      expect(result).toHaveProperty('name', 'Test Room');
      expect(result).toHaveProperty('stage', 'PLANNING');
    });

    it('should accept codes with hyphens', async () => {
      const event = createMockAppSyncEvent('createRoom', {
        name: 'Test Room',
        code: 'ABC-123',
      });

      mockSend.mockResolvedValue({});

      const result = await handler(event);

      expect(result).toHaveProperty('code', 'ABC-123');
    });

    it('should reject codes with lowercase letters', async () => {
      const event = createMockAppSyncEvent('createRoom', {
        name: 'Test Room',
        code: 'abc123',
      });

      await expect(handler(event)).rejects.toThrow(
        'Room code must be 3-20 uppercase alphanumeric characters'
      );
    });

    it('should reject codes shorter than 3 characters', async () => {
      const event = createMockAppSyncEvent('createRoom', {
        name: 'Test Room',
        code: 'AB',
      });

      await expect(handler(event)).rejects.toThrow(
        'Room code must be 3-20 uppercase alphanumeric characters'
      );
    });

    it('should reject codes with special characters (except hyphens)', async () => {
      const event = createMockAppSyncEvent('createRoom', {
        name: 'Test Room',
        code: 'ABC@123',
      });

      await expect(handler(event)).rejects.toThrow(
        'Room code must be 3-20 uppercase alphanumeric characters'
      );
    });
  });

  describe('Vote Value Validation', () => {
    it('should accept valid numeric vote values', async () => {
      const event = createMockAppSyncEvent('castVote', {
        roomId: 'room-123',
        storyId: 'story-456',
        value: '5',
      });

      mockSend.mockResolvedValue({});

      const result = await handler(event);

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('value', '5');
      expect(result).toHaveProperty('storyId', 'story-456');
    });

    it('should accept special card ☕', async () => {
      const event = createMockAppSyncEvent('castVote', {
        roomId: 'room-123',
        storyId: 'story-456',
        value: '☕',
      });

      mockSend.mockResolvedValue({});

      const result = await handler(event);

      expect(result).toHaveProperty('value', '☕');
    });

    it('should accept special card ❓', async () => {
      const event = createMockAppSyncEvent('castVote', {
        roomId: 'room-123',
        storyId: 'story-456',
        value: '❓',
      });

      mockSend.mockResolvedValue({});

      const result = await handler(event);

      expect(result).toHaveProperty('value', '❓');
    });

    it('should reject invalid vote values', async () => {
      const event = createMockAppSyncEvent('castVote', {
        roomId: 'room-123',
        storyId: 'story-456',
        value: '99',
      });

      await expect(handler(event)).rejects.toThrow('Invalid vote value');
    });
  });

  describe('Moderator Authorization', () => {
    it('should allow moderator to reveal votes', async () => {
      const event = createMockAppSyncEvent('revealVotes', {
        roomId: 'room-123',
        storyId: 'story-456',
      });

      // Mock getUserRole - user is moderator, then story update, then get updated story
      mockSend
        .mockResolvedValueOnce({
          Item: marshall({
            PK: 'ROOM#room-123',
            SK: 'PRES#user-123',
            role: 'MODERATOR',
          }),
        })
        .mockResolvedValueOnce({}) // Update story
        .mockResolvedValueOnce({
          Item: marshall({
            id: 'story-456',
            roomId: 'room-123',
            revealed: true,
            voteCount: 2,
            avgVote: 6.5,
          }),
        });

      const result = await handler(event);

      expect(result).toHaveProperty('revealed', true);
      expect(result).toHaveProperty('id', 'story-456');
    });

    it('should deny non-moderator from revealing votes', async () => {
      const event = createMockAppSyncEvent('revealVotes', {
        roomId: 'room-123',
        storyId: 'story-456',
      });

      // Mock getUserRole - user is not moderator
      mockSend.mockResolvedValueOnce({
        Item: marshall({
          PK: 'ROOM#room-123',
          SK: 'PRES#user-123',
          role: 'MEMBER',
        }),
      });

      await expect(handler(event)).rejects.toThrow(
        'Only the moderator can reveal votes'
      );
    });

    it('should allow moderator to change room stage', async () => {
      const event = createMockAppSyncEvent('setRoomStage', {
        roomId: 'room-123',
        stage: 'RETRO',
      });

      // Mock getUserRole - user is moderator, then room update, then get updated room
      mockSend
        .mockResolvedValueOnce({
          Item: marshall({
            PK: 'ROOM#room-123',
            SK: 'PRES#user-123',
            role: 'MODERATOR',
          }),
        })
        .mockResolvedValueOnce({}) // Update room
        .mockResolvedValueOnce({
          Item: marshall({
            id: 'room-123',
            stage: 'RETRO',
            name: 'Test Room',
          }),
        });

      const result = await handler(event);

      expect(result).toHaveProperty('stage', 'RETRO');
    });

    it('should deny non-moderator from changing stage', async () => {
      const event = createMockAppSyncEvent('setRoomStage', {
        roomId: 'room-123',
        stage: 'RETRO',
      });

      // Mock getUserRole - user is not moderator
      mockSend.mockResolvedValueOnce({
        Item: marshall({
          PK: 'ROOM#room-123',
          SK: 'PRES#user-123',
          role: 'MEMBER',
        }),
      });

      await expect(handler(event)).rejects.toThrow(
        'Only the moderator can change the room stage'
      );
    });
  });

  describe('Room Creation and Joining', () => {
    it('should create room with correct initial state', async () => {
      const event = createMockAppSyncEvent('createRoom', {
        name: 'Test Room',
        code: 'ABC123',
      });

      mockSend.mockResolvedValue({});

      const result = await handler(event);

      expect(result).toHaveProperty('stage', 'PLANNING');
      expect(result).toHaveProperty('createdBy', 'user-123');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should join room and create presence record', async () => {
      const event = createMockAppSyncEvent('joinRoom', {
        code: 'ABC123',
        displayName: 'Test User',
      });

      // Mock getRoomByCode (2 calls: GSI1 query + GetItem), then create presence
      mockSend
        .mockResolvedValueOnce({
          Items: [
            marshall({
              roomId: 'room-123',
            }),
          ],
        })
        .mockResolvedValueOnce({
          Item: marshall({
            PK: 'ROOM#room-123',
            SK: 'ROOM#room-123',
            id: 'room-123',
            code: 'ABC123',
            name: 'Test Room',
            createdBy: 'user-456',
            stage: 'PLANNING',
          }),
        })
        .mockResolvedValueOnce({}); // Create presence

      const result = await handler(event);

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('roomId', 'room-123');
      expect(result).toHaveProperty('displayName', 'Test User');
      expect(result).toHaveProperty('role', 'MEMBER');
      expect(result).toHaveProperty('state', 'ONLINE');
    });

    it('should make room creator a moderator when joining', async () => {
      const event = createMockAppSyncEvent('joinRoom', {
        code: 'ABC123',
        displayName: 'Test User',
      }, 'user-123');

      // Mock getRoomByCode (2 calls: GSI1 query + GetItem) - user is creator, then create presence
      mockSend
        .mockResolvedValueOnce({
          Items: [
            marshall({
              roomId: 'room-123',
            }),
          ],
        })
        .mockResolvedValueOnce({
          Item: marshall({
            PK: 'ROOM#room-123',
            SK: 'ROOM#room-123',
            id: 'room-123',
            code: 'ABC123',
            name: 'Test Room',
            createdBy: 'user-123',
            stage: 'PLANNING',
          }),
        })
        .mockResolvedValueOnce({}); // Create presence

      const result = await handler(event);

      expect(result).toHaveProperty('role', 'MODERATOR');
    });
  });
});
