import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export class ScrumRealtimeStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly table: dynamodb.Table;
  public readonly api: appsync.GraphqlApi;
  public readonly mutationsFunction: lambda.Function;
  public readonly tallyDLQ: sqs.Queue;
  public readonly tallyFunction: lambda.Function;
  public readonly alarmTopic: sns.Topic;
  public readonly probeFunction: lambda.Function;
  public readonly domoETLFunction: lambda.Function;
  public readonly domoETLDLQ: sqs.Queue;
  public readonly amplifyApp: amplify.CfnApp;
  public readonly amplifyBranch: amplify.CfnBranch;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // Cognito User Pool
    // ========================================
    this.userPool = new cognito.UserPool(this, 'ScrumRealtimeUserPool', {
      userPoolName: 'scrum-reborn-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.userPoolClient = this.userPool.addClient('ScrumRealtimeClient', {
      userPoolClientName: 'scrum-reborn-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // ========================================
    // DynamoDB Table
    // ========================================
    this.table = new dynamodb.Table(this, 'ScrumRealtimeTable', {
      tableName: 'ScrumRealtimeTable',
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // Add GSI1 for room code lookups and user's rooms
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // AppSync GraphQL API
    // ========================================
    this.api = new appsync.GraphqlApi(this, 'ScrumRealtimeApi', {
      name: 'scrum-reborn-api',
      definition: appsync.Definition.fromFile(
        path.join(__dirname, '../../graphql/schema.graphql')
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: this.userPool,
          },
        },
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ERROR,
        excludeVerboseContent: false,
        retention: logs.RetentionDays.ONE_WEEK,
      },
      xrayEnabled: true,
    });

    // ========================================
    // Mutations Lambda Function
    // ========================================
    this.mutationsFunction = new lambda.Function(this, 'MutationsResolver', {
      functionName: 'scrum-reborn-mutations',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/mutations')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: {
        TABLE_NAME: this.table.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant DynamoDB permissions to mutations function
    this.table.grantReadWriteData(this.mutationsFunction);

    // Grant CloudWatch permissions to mutations function
    this.mutationsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Attach mutations Lambda as AppSync data source
    const mutationsDataSource = this.api.addLambdaDataSource(
      'MutationsDataSource',
      this.mutationsFunction,
      {
        name: 'MutationsDataSource',
        description: 'Lambda resolver for all mutations and queries',
      }
    );

    // Wire mutations to the data source
    const mutations = [
      'createRoom',
      'setRoomStage',
      'joinRoom',
      'leaveRoom',
      'setPresence',
      'createStory',
      'updateStory',
      'deleteStory',
      'castVote',
      'retractVote',
      'revealVotes',
      'addRetroNote',
      'voteRetroNote',
    ];

    mutations.forEach((mutation) => {
      mutationsDataSource.createResolver(`${mutation}Resolver`, {
        typeName: 'Mutation',
        fieldName: mutation,
      });
    });

    // Wire queries to the data source
    const queries = [
      'getRoom',
      'getRoomByCode',
      'listRooms',
      'getStory',
      'listStories',
      'listRetro',
    ];

    queries.forEach((query) => {
      mutationsDataSource.createResolver(`${query}Resolver`, {
        typeName: 'Query',
        fieldName: query,
      });
    });

    // ========================================
    // Dead Letter Queue for Tally Processor
    // ========================================
    this.tallyDLQ = new sqs.Queue(this, 'TallyProcessorDLQ', {
      queueName: 'scrum-reborn-tally-dlq',
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // Tally Processor Lambda Function
    // ========================================
    this.tallyFunction = new lambda.Function(this, 'TallyProcessor', {
      functionName: 'scrum-reborn-tally-processor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/tally')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: this.table.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant DynamoDB permissions to tally function
    this.table.grantReadWriteData(this.tallyFunction);

    // Grant CloudWatch permissions to tally function
    this.tallyFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Configure DynamoDB Streams event source with error handling
    this.tallyFunction.addEventSource(
      new lambdaEventSources.DynamoEventSource(this.table, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 50,
        bisectBatchOnError: true,
        retryAttempts: 3,
        onFailure: new lambdaEventSources.SqsDlq(this.tallyDLQ),
        reportBatchItemFailures: false,
      })
    );

    // ========================================
    // Synthetic Probe Lambda Function
    // ========================================
    this.probeFunction = new lambda.Function(this, 'SyntheticProbe', {
      functionName: 'scrum-reborn-synthetic-probe',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/probe')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      environment: {
        GRAPHQL_ENDPOINT: this.api.graphqlUrl,
        USER_POOL_ID: this.userPool.userPoolId,
        CLIENT_ID: this.userPoolClient.userPoolClientId,
        // AWS_REGION is automatically provided by Lambda runtime
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant CloudWatch permissions to probe function
    this.probeFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Grant Cognito permissions to probe function
    this.probeFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:SignUp',
          'cognito-idp:AdminConfirmSignUp',
          'cognito-idp:InitiateAuth',
        ],
        resources: [this.userPool.userPoolArn],
      })
    );

    // EventBridge rule for daily execution at 07:00 UTC
    const probeRule = new events.Rule(this, 'ProbeScheduleRule', {
      ruleName: 'scrum-reborn-nightly-probe',
      description: 'Triggers synthetic probe daily at 07:00 UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '7',
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    probeRule.addTarget(new eventsTargets.LambdaFunction(this.probeFunction));

    // ========================================
    // Domo ETL Pipeline
    // ========================================

    // Dead Letter Queue for Domo ETL
    this.domoETLDLQ = new sqs.Queue(this, 'DomoETLDLQ', {
      queueName: 'scrum-reborn-domo-etl-dlq',
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Domo ETL Lambda Function
    this.domoETLFunction = new lambda.Function(this, 'DomoETLFunction', {
      functionName: 'scrum-reborn-domo-etl',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/domo-etl')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      environment: {
        DOMO_API_ENDPOINT: process.env.DOMO_API_ENDPOINT || '',
        DOMO_API_TOKEN: process.env.DOMO_API_TOKEN || '',
        DOMO_DATASET_ID: process.env.DOMO_DATASET_ID || '',
        // AWS_REGION is automatically provided by Lambda runtime
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueue: this.domoETLDLQ,
    });

    // Grant CloudWatch read permissions to Domo ETL function
    this.domoETLFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:GetMetricStatistics', 'cloudwatch:ListMetrics'],
        resources: ['*'],
      })
    );

    // EventBridge rule for every 15 minutes
    const domoETLRule = new events.Rule(this, 'DomoETLScheduleRule', {
      ruleName: 'scrum-reborn-domo-etl',
      description: 'Triggers Domo ETL pipeline every 15 minutes',
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
    });

    domoETLRule.addTarget(new eventsTargets.LambdaFunction(this.domoETLFunction));

    // ========================================
    // SNS Topic for Alarms
    // ========================================
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: 'scrum-reborn-alarms',
      displayName: 'Scrum Reborn Monitoring Alarms',
    });

    // ========================================
    // CloudWatch Alarms
    // ========================================

    // High Error Rate Alarm (>10 errors in 5 minutes)
    const errorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: 'ScrumReborn-HighErrorRate',
      alarmDescription: 'Triggers when Lambda error rate exceeds 10 in 5 minutes',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: {
          FunctionName: this.mutationsFunction.functionName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // High Latency Alarm (p95 >500ms)
    const highLatencyAlarm = new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      alarmName: 'ScrumReborn-HighLatency',
      alarmDescription: 'Triggers when mutation latency p95 exceeds 500ms',
      metric: new cloudwatch.Metric({
        namespace: 'ScrumReborn',
        metricName: 'MutationLatency',
        statistic: 'p95',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 500,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    highLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // DynamoDB Throttling Alarm (>0 in 1 minute)
    const throttlingAlarm = new cloudwatch.Alarm(this, 'DynamoDBThrottlingAlarm', {
      alarmName: 'ScrumReborn-DynamoDBThrottling',
      alarmDescription: 'Triggers when DynamoDB throttling occurs',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'UserErrors',
        dimensionsMap: {
          TableName: this.table.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    throttlingAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Tally Processor High Latency Alarm (p95 >2000ms)
    const tallyLatencyAlarm = new cloudwatch.Alarm(this, 'TallyHighLatencyAlarm', {
      alarmName: 'ScrumReborn-TallyHighLatency',
      alarmDescription: 'Triggers when vote tally latency p95 exceeds 2 seconds',
      metric: new cloudwatch.Metric({
        namespace: 'ScrumReborn',
        metricName: 'VoteTallyLatency',
        statistic: 'p95',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 2000,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    tallyLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Probe Failure Alarm
    const probeFailureAlarm = new cloudwatch.Alarm(this, 'ProbeFailureAlarm', {
      alarmName: 'ScrumReborn-ProbeFailure',
      alarmDescription: 'Triggers when nightly synthetic probe fails',
      metric: new cloudwatch.Metric({
        namespace: 'ScrumReborn',
        metricName: 'ProbeFailure',
        statistic: 'Sum',
        period: cdk.Duration.hours(1),
      }),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    probeFailureAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // ========================================
    // Stack Outputs
    // ========================================
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.api.graphqlUrl,
      description: 'GraphQL API URL',
      exportName: 'ScrumReborn-GraphQLApiUrl',
    });

    new cdk.CfnOutput(this, 'GraphQLApiId', {
      value: this.api.apiId,
      description: 'GraphQL API ID',
      exportName: 'ScrumReborn-GraphQLApiId',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'ScrumReborn-UserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'ScrumReborn-UserPoolClientId',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
      exportName: 'ScrumReborn-DynamoDBTableName',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: cdk.Stack.of(this).region,
      description: 'AWS Region',
      exportName: 'ScrumReborn-Region',
    });

    new cdk.CfnOutput(this, 'TallyDLQUrl', {
      value: this.tallyDLQ.queueUrl,
      description: 'Tally Processor Dead Letter Queue URL',
      exportName: 'ScrumReborn-TallyDLQUrl',
    });

    new cdk.CfnOutput(this, 'TallyFunctionName', {
      value: this.tallyFunction.functionName,
      description: 'Tally Processor Lambda Function Name',
      exportName: 'ScrumReborn-TallyFunctionName',
    });

    new cdk.CfnOutput(this, 'MutationsFunctionName', {
      value: this.mutationsFunction.functionName,
      description: 'Mutations Resolver Lambda Function Name',
      exportName: 'ScrumReborn-MutationsFunctionName',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for CloudWatch Alarms',
      exportName: 'ScrumReborn-AlarmTopicArn',
    });

    new cdk.CfnOutput(this, 'ProbeFunctionName', {
      value: this.probeFunction.functionName,
      description: 'Synthetic Probe Lambda Function Name',
      exportName: 'ScrumReborn-ProbeFunctionName',
    });

    new cdk.CfnOutput(this, 'DomoETLFunctionName', {
      value: this.domoETLFunction.functionName,
      description: 'Domo ETL Lambda Function Name',
      exportName: 'ScrumReborn-DomoETLFunctionName',
    });

    new cdk.CfnOutput(this, 'DomoETLDLQUrl', {
      value: this.domoETLDLQ.queueUrl,
      description: 'Domo ETL Dead Letter Queue URL',
      exportName: 'ScrumReborn-DomoETLDLQUrl',
    });

    // ========================================
    // AWS Amplify Hosting for Frontend
    // ========================================

    // Retrieve GitHub token from Secrets Manager
    const githubToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      'GitHubToken',
      'scrum-reborn/github-token'
    );

    // Create Amplify App
    this.amplifyApp = new amplify.CfnApp(this, 'ScrumRebornAmplifyApp', {
      name: 'scrum-reborn',
      repository: 'https://github.com/sgharlow/scrum-web-reborn',
      accessToken: githubToken.secretValue.unsafeUnwrap(), // Retrieves token from Secrets Manager
      buildSpec: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*`,
      environmentVariables: [
        {
          name: 'VITE_AWS_REGION',
          value: this.region,
        },
        {
          name: 'VITE_GRAPHQL_ENDPOINT',
          value: this.api.graphqlUrl,
        },
        {
          name: 'VITE_COGNITO_USER_POOL_ID',
          value: this.userPool.userPoolId,
        },
        {
          name: 'VITE_COGNITO_CLIENT_ID',
          value: this.userPoolClient.userPoolClientId,
        },
      ],
      customRules: [
        {
          source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>',
          target: '/index.html',
          status: '200',
        },
      ],
    });

    // Create main branch
    this.amplifyBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: this.amplifyApp.attrAppId,
      branchName: 'main',
      enableAutoBuild: true,
      enablePullRequestPreview: false,
    });

    // Output Amplify App URL
    new cdk.CfnOutput(this, 'AmplifyAppUrl', {
      value: `https://main.${this.amplifyApp.attrDefaultDomain}`,
      description: 'Amplify App URL',
      exportName: 'ScrumReborn-AmplifyAppUrl',
    });

    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: this.amplifyApp.attrAppId,
      description: 'Amplify App ID',
      exportName: 'ScrumReborn-AmplifyAppId',
    });
  }
}
