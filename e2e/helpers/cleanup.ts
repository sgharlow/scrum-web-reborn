import { DynamoDBClient, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

/**
 * Clean up all test data for a specific room
 */
export async function cleanupTestRoom(roomId: string): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  
  if (!tableName) {
    console.warn('DYNAMODB_TABLE_NAME not set, skipping cleanup');
    return;
  }
  
  const dynamodb = new DynamoDBClient({
    region: process.env.VITE_AWS_REGION || 'us-east-1',
  });
  
  try {
    // Query all items for the room
    const queryResult = await dynamodb.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: `ROOM#${roomId}` },
      },
    }));
    
    if (!queryResult.Items || queryResult.Items.length === 0) {
      console.log(`No items found for room ${roomId}`);
      return;
    }
    
    // Delete all items
    const deletePromises = queryResult.Items.map(item => {
      const unmarshalled = unmarshall(item);
      return dynamodb.send(new DeleteItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: unmarshalled.PK },
          SK: { S: unmarshalled.SK },
        },
      }));
    });
    
    await Promise.all(deletePromises);
    console.log(`✓ Cleaned up ${queryResult.Items.length} items for room ${roomId}`);
  } catch (error) {
    console.error(`Failed to cleanup room ${roomId}:`, error);
    throw error;
  }
}

/**
 * Clean up test data for multiple rooms
 */
export async function cleanupTestRooms(roomIds: string[]): Promise<void> {
  const cleanupPromises = roomIds.map(roomId => cleanupTestRoom(roomId));
  await Promise.all(cleanupPromises);
}

/**
 * Clean up presence records for a specific user
 */
export async function cleanupUserPresence(userId: string): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  
  if (!tableName) {
    console.warn('DYNAMODB_TABLE_NAME not set, skipping cleanup');
    return;
  }
  
  const dynamodb = new DynamoDBClient({
    region: process.env.VITE_AWS_REGION || 'us-east-1',
  });
  
  try {
    // Query presence records for the user across all rooms
    const queryResult = await dynamodb.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1', // Assuming GSI1 is used for user lookups
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': { S: `USER#${userId}` },
      },
    }));
    
    if (!queryResult.Items || queryResult.Items.length === 0) {
      return;
    }
    
    // Delete presence records
    const deletePromises = queryResult.Items.map(item => {
      const unmarshalled = unmarshall(item);
      return dynamodb.send(new DeleteItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: unmarshalled.PK },
          SK: { S: unmarshalled.SK },
        },
      }));
    });
    
    await Promise.all(deletePromises);
    console.log(`✓ Cleaned up presence for user ${userId}`);
  } catch (error) {
    console.error(`Failed to cleanup presence for user ${userId}:`, error);
  }
}

/**
 * Generate a unique room code for testing
 */
export function generateTestRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TEST';
  for (let i = 0; i < 2; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Wait for a specified duration (for debugging/manual inspection)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await wait(delay);
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}
