# Demo Dataset Setup Guide

This guide helps you create a realistic demo dataset for Scrum Reborn, perfect for demonstrations, testing, and hackathon submissions.

## Quick Setup

### Step 1: Create Demo Users

Create these test users in AWS Cognito:

| Email | Password | Name | Role |
|-------|----------|------|------|
| `alice@demo.scrumreborn.com` | `Demo1234!` | Alice | Moderator |
| `bob@demo.scrumreborn.com` | `Demo1234!` | Bob | Developer |
| `charlie@demo.scrumreborn.com` | `Demo1234!` | Charlie | Designer |
| `diana@demo.scrumreborn.com` | `Demo1234!` | Diana | QA Engineer |

**Using AWS CLI:**

```bash
# Set your User Pool ID
USER_POOL_ID="us-east-1_xxxxxxxxx"

# Create Alice (Moderator)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username alice@demo.scrumreborn.com \
  --user-attributes Name=email,Value=alice@demo.scrumreborn.com Name=email_verified,Value=true Name=name,Value=Alice \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username alice@demo.scrumreborn.com \
  --password Demo1234! \
  --permanent

# Create Bob (Developer)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username bob@demo.scrumreborn.com \
  --user-attributes Name=email,Value=bob@demo.scrumreborn.com Name=email_verified,Value=true Name=name,Value=Bob \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username bob@demo.scrumreborn.com \
  --password Demo1234! \
  --permanent

# Create Charlie (Designer)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username charlie@demo.scrumreborn.com \
  --user-attributes Name=email,Value=charlie@demo.scrumreborn.com Name=email_verified,Value=true Name=name,Value=Charlie \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username charlie@demo.scrumreborn.com \
  --password Demo1234! \
  --permanent

# Create Diana (QA)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username diana@demo.scrumreborn.com \
  --user-attributes Name=email,Value=diana@demo.scrumreborn.com Name=email_verified,Value=true Name=name,Value=Diana \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username diana@demo.scrumreborn.com \
  --password Demo1234! \
  --permanent
```

**Using the UI:**

1. Open your deployed Scrum Reborn app
2. Click "Sign Up" for each user
3. Use the emails and passwords from the table above
4. Verify emails if required (or use AWS CLI to mark as verified)

### Step 2: Create Planning Poker Room

Sign in as **Alice** and create a room:

- **Room Name**: "Sprint 24 Planning"
- **Room Code**: `DEMO01`
- **Stage**: Planning

Add these stories:

1. **User authentication with OAuth**
   - Description: "Implement social login (Google, GitHub)"
   - Tags: `backend`, `security`

2. **Responsive mobile layout**
   - Description: "Optimize UI for mobile devices"
   - Tags: `frontend`, `ui`

3. **Real-time notifications**
   - Description: "Push notifications for room events"
   - Tags: `backend`, `realtime`

4. **Export retro notes to PDF**
   - Description: "Generate downloadable retrospective summary"
   - Tags: `feature`, `export`

5. **Dark mode support**
   - Description: "Add theme toggle and dark color scheme"
   - Tags: `frontend`, `ui`

### Step 3: Cast Sample Votes

To demonstrate the voting feature:

1. Keep Alice signed in (Moderator)
2. Open a new incognito window and sign in as **Bob**
3. Join room with code `DEMO01`
4. Both users select the first story
5. Cast votes:
   - Alice: `5`
   - Bob: `8`
6. As Alice, click "Reveal Votes"
7. See the average: `6.5`

Repeat for other stories with different vote patterns:
- Story 2: Alice=`3`, Bob=`5`, Charlie=`3` → Avg: `3.67`
- Story 3: Alice=`13`, Bob=`8`, Charlie=`13`, Diana=`8` → Avg: `10.5`
- Story 4: Alice=`5`, Bob=`☕` (coffee break - excluded from average)
- Story 5: Alice=`2`, Bob=`2`, Charlie=`2` → Consensus!

### Step 4: Create Retrospective Room

Sign in as **Alice** and create another room:

- **Room Name**: "Sprint 23 Retro"
- **Room Code**: `RETRO1`
- **Stage**: Retro

Add these retro notes:

**Went Well** 🟢
- "Great collaboration on the authentication feature"
- "Deployment pipeline is smooth and reliable"
- "Team communication improved significantly"

**To Improve** 🟡
- "Need better test coverage for edge cases"
- "Code review turnaround time could be faster"
- "Documentation needs updating"

**Action Items** 🔴
- "Set up automated accessibility testing"
- "Schedule knowledge sharing session on GraphQL"
- "Create onboarding guide for new team members"

### Step 5: Vote on Retro Notes

Have multiple users vote on retro notes to show prioritization:

1. Sign in as different users (Bob, Charlie, Diana)
2. Join room `RETRO1`
3. Vote on action items to prioritize them
4. The note with most votes rises to the top

## Automated Script (Optional)

For faster setup, use the provided script:

```bash
cd infra/scripts

# Install dependencies
npm install @aws-sdk/client-cognito-identity-provider jose node-fetch

# Run script
node create-demo-data.mjs \
  --user-pool-id us-east-1_xxxxxxxxx \
  --client-id xxxxxxxxxxxxxxxxxxxxxxxxxx \
  --graphql-endpoint https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql \
  --region us-east-1
```

This creates all demo users automatically. You'll still need to create rooms and stories via the UI.

## Demo Scenarios

### Scenario 1: Multi-Device Sync

**Purpose**: Show real-time synchronization

1. Open app on laptop (Alice)
2. Open app on phone (Bob)
3. Create room on laptop
4. Join from phone using room code
5. Cast votes on both devices
6. Watch votes appear instantly on both screens
7. Reveal votes and see synchronized results

### Scenario 2: Presence Tracking

**Purpose**: Show who's in the room

1. Alice creates room
2. Bob joins → Alice sees "Bob joined"
3. Charlie joins → Both see "Charlie joined"
4. Bob closes tab → After 90s, Bob disappears from participant list
5. Demonstrates automatic cleanup via TTL

### Scenario 3: Moderator Controls

**Purpose**: Show role-based permissions

1. Alice (moderator) can reveal votes
2. Bob (member) tries to reveal → Gets error "Only moderator can reveal votes"
3. Alice changes room stage from Planning → Retro
4. Bob cannot change stage (moderator-only action)

### Scenario 4: Retro Voting

**Purpose**: Show collaborative prioritization

1. Team adds retro notes in all categories
2. Everyone votes on action items
3. Notes with most votes rise to top
4. Team discusses top-voted items first

## Demo Tips

### For Presentations

- **Pre-create rooms** with codes like `DEMO01`, `DEMO02` for easy joining
- **Use short, memorable codes** (avoid random characters)
- **Pre-populate stories** so you can jump straight to voting
- **Have multiple devices ready** to show real-time sync
- **Use large font sizes** for visibility in screen shares

### For Testing

- **Test disconnection scenarios**: Close tabs, lose network, refresh pages
- **Test edge cases**: Empty rooms, single user, 10+ users
- **Test vote patterns**: All same vote (consensus), all different (no consensus), special cards (☕, ❓)
- **Test retro categories**: Ensure all three categories work

### For Hackathon Judges

- **Show the problem first**: Explain P2P connectivity issues (50% success rate)
- **Show the solution**: AppSync guarantees 99.5%+ connectivity
- **Live demo**: Create room, join from phone, vote, reveal
- **Show monitoring**: CloudWatch metrics, SLI dashboard
- **Highlight Kiro**: Show specs, design docs, automated deployment

## Cleanup

To remove demo data:

```bash
# Delete demo users
aws cognito-idp admin-delete-user \
  --user-pool-id $USER_POOL_ID \
  --username alice@demo.scrumreborn.com

# Repeat for other users...
```

Rooms and stories will auto-expire based on TTL settings, or you can delete them via the UI.

## Troubleshooting

### Users Can't Sign In

- Verify users are confirmed: `aws cognito-idp admin-get-user --user-pool-id $USER_POOL_ID --username alice@demo.scrumreborn.com`
- Check password meets requirements (min 8 chars, 1 digit)
- Ensure email is verified

### Room Code Not Found

- Verify room was created successfully
- Check code is exactly 6 uppercase alphanumeric characters
- Query DynamoDB to confirm room exists

### Votes Not Updating

- Check DynamoDB Streams are enabled
- Verify tally Lambda is running (check CloudWatch Logs)
- Ensure users are in the same room

---

**Ready to demo!** 🎉

Your Scrum Reborn instance is now populated with realistic data for demonstrations, testing, and showcasing the platform's capabilities.
