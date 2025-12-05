#!/usr/bin/env node
/**
 * Test Data Cleanup Script
 * 
 * Removes test data from DynamoDB after E2E test runs.
 * Usage: npm run cleanup-test-data [roomId]
 */

import { DynamoDBClient, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const TABLE_NAME = process.env.VITE_TABLE_NAME || 'ScrumRealtimeStack-Table';
const AWS_REGION = process.env.VITE_AWS_REGION || 'us-east-1';

const dynamodb = new DynamoDBClient({ region: AWS_REGION });

interface CleanupOptions {
  roomId?: string;
  dryRun?: boolean;
}

async function cleanupRoom(roomId: string, dryRun: boolean = false): Promise<number> {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Cleaning up room: ${roomId}`);
  
  let deletedCount = 0;
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    // Query all items for this room
    const queryResponse = await dynamodb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: `ROOM#${roomId}` },
      },
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    const items = queryResponse.Items || [];
    
    for (const item of items) {
      const unmarshalled = unmarshall(item);
      console.log(`  ${dryRun ? '[DRY RUN] ' : ''}Deleting: ${unmarshalled.PK} / ${unmarshalled.SK}`);
      
      if (!dryRun) {
        await dynamodb.send(new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        }));
      }
      
      deletedCount++;
    }

    lastEvaluatedKey = queryResponse.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return deletedCount;
}

async function cleanupTestRooms(dryRun: boolean = false): Promise<void> {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Cleaning up all test rooms (prefix: TEST-)`);
  
  let totalDeleted = 0;
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    // Scan for all test rooms
    const scanResponse = await dynamodb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      FilterExpression: 'begins_with(#code, :prefix)',
      ExpressionAttributeNames: {
        '#code': 'code',
      },
      ExpressionAttributeValues: {
        ':gsi1pk': { S: 'ROOM' },
        ':prefix': { S: 'TEST-' },
      },
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    const rooms = scanResponse.Items || [];
    
    for (const room of rooms) {
      const unmarshalled = unmarshall(room);
      const roomId = unmarshalled.id;
      const deleted = await cleanupRoom(roomId, dryRun);
      totalDeleted += deleted;
    }

    lastEvaluatedKey = scanResponse.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Total items deleted: ${totalDeleted}`);
}

async function main() {
  const args = process.argv.slice(2);
  const roomId = args.find(arg => !arg.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  console.log('Test Data Cleanup Script');
  console.log('========================\n');
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Dry Run: ${dryRun}\n`);

  try {
    if (roomId) {
      const deleted = await cleanupRoom(roomId, dryRun);
      console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Deleted ${deleted} items from room ${roomId}`);
    } else {
      await cleanupTestRooms(dryRun);
    }
    
    if (dryRun) {
      console.log('\n✓ Dry run complete. Run without --dry-run to actually delete data.');
    } else {
      console.log('\n✓ Cleanup complete.');
    }
  } catch (error) {
    console.error('\n✗ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
