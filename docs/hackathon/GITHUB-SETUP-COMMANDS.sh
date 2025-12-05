#!/bin/bash
# GitHub Repository Setup Commands
# Run these commands to configure your repository metadata for hackathon submission

# Ensure you have GitHub CLI installed
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Linux: See https://cli.github.com/

# Authenticate if needed
gh auth status || gh auth login

# Set repository description
gh repo edit sgharlow/scrum-web-reborn \
  --description "99x more reliable real-time Scrum collaboration with AWS AppSync - Planning poker and retrospectives that just work"

# Add topics/tags
gh repo edit sgharlow/scrum-web-reborn \
  --add-topic aws \
  --add-topic appsync \
  --add-topic dynamodb \
  --add-topic hackathon \
  --add-topic kiro \
  --add-topic scrum \
  --add-topic planning-poker \
  --add-topic typescript \
  --add-topic react \
  --add-topic graphql \
  --add-topic serverless \
  --add-topic real-time

# Set homepage URL
gh repo edit sgharlow/scrum-web-reborn \
  --homepage https://main.d3tvb88c55agb4.amplifyapp.com

# Verify settings
echo ""
echo "✅ Repository configured! Verify at:"
echo "https://github.com/sgharlow/scrum-web-reborn"
echo ""
echo "Expected settings:"
echo "  Description: 99x more reliable real-time Scrum collaboration with AWS AppSync..."
echo "  Homepage: https://main.d3tvb88c55agb4.amplifyapp.com"
echo "  Topics: aws, appsync, dynamodb, hackathon, kiro, scrum, planning-poker, typescript, react, graphql, serverless, real-time"
