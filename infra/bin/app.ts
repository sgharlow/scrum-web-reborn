#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ScrumRealtimeStack } from '../lib/scrum-realtime-stack';

const app = new cdk.App();

new ScrumRealtimeStack(app, 'ScrumRealtimeStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Scrum Reborn - AppSync + DynamoDB infrastructure for real-time collaboration',
});

app.synth();
