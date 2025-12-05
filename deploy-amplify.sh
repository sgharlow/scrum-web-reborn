#!/bin/bash

# Deploy Scrum Reborn to AWS Amplify via CDK
# Uses wpengine2 AWS credentials profile

set -e  # Exit on error

PROFILE="wpengine2"
REGION="us-east-1"
GITHUB_TOKEN=""

echo "🚀 Scrum Reborn - AWS Amplify Deployment Script"
echo "==============================================="
echo ""

# Step 1: Check if GitHub token is provided
if [ -z "$1" ]; then
    echo "❌ ERROR: GitHub Personal Access Token required"
    echo ""
    echo "Usage: ./deploy-amplify.sh <GITHUB_TOKEN>"
    echo ""
    echo "To create a GitHub token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select scopes: repo (all), admin:repo_hook (all)"
    echo "4. Copy the token (starts with ghp_)"
    echo ""
    exit 1
fi

GITHUB_TOKEN="$1"

echo "✅ GitHub token provided"
echo ""

# Step 2: Store GitHub token in AWS Secrets Manager
echo "📦 Step 1/3: Storing GitHub token in AWS Secrets Manager..."
echo ""

# Check if secret already exists
SECRET_EXISTS=$(aws secretsmanager describe-secret \
    --secret-id scrum-reborn/github-token \
    --profile "$PROFILE" \
    --region "$REGION" 2>&1 || echo "NotFound")

if [[ "$SECRET_EXISTS" == *"NotFound"* ]] || [[ "$SECRET_EXISTS" == *"ResourceNotFoundException"* ]]; then
    echo "Creating new secret..."
    aws secretsmanager create-secret \
        --name scrum-reborn/github-token \
        --secret-string "$GITHUB_TOKEN" \
        --profile "$PROFILE" \
        --region "$REGION" \
        --description "GitHub Personal Access Token for Amplify deployment"
    echo "✅ Secret created successfully"
else
    echo "Secret already exists, updating value..."
    aws secretsmanager update-secret \
        --secret-id scrum-reborn/github-token \
        --secret-string "$GITHUB_TOKEN" \
        --profile "$PROFILE" \
        --region "$REGION"
    echo "✅ Secret updated successfully"
fi

echo ""

# Step 3: Build CDK stack
echo "🔨 Step 2/3: Building CDK stack..."
echo ""
cd infra
npm run build
echo "✅ CDK stack built successfully"
echo ""

# Step 4: Deploy CDK stack with Amplify
echo "🚀 Step 3/3: Deploying to AWS (this takes 3-5 minutes)..."
echo ""
cdk deploy --profile "$PROFILE" --require-approval never

echo ""
echo "============================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================="
echo ""
echo "Your Amplify app is now deploying. This takes an additional 3-5 minutes."
echo ""
echo "To view deployment status:"
echo "1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1"
echo "2. Click on 'scrum-reborn' app"
echo "3. Watch the build progress"
echo ""
echo "Once deployment completes, your app will be live at:"
echo "👉 Check the 'AmplifyAppUrl' output above"
echo ""
echo "Next steps:"
echo "1. Wait for Amplify build to complete (check console)"
echo "2. Test your live app URL"
echo "3. Make your GitHub repo public for hackathon submission"
echo ""
