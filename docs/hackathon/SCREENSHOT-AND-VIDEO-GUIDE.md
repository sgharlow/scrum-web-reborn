# Screenshot and Video Creation Guide

**Purpose**: Guide for creating professional screenshots and demo video for hackathon submission  
**Time Required**: 1-2 hours  
**Tools Needed**: Browser, OBS Studio/Loom, Image editor (optional)

---

## Part 1: Screenshots for Devpost (30 minutes)

### Required Screenshots (5 total)

#### 1. Authentication Flow
**What to capture**: Sign-in page with clean UI
**Steps**:
1. Open app in browser
2. Ensure you're signed out
3. Take screenshot of sign-in form
4. **Key elements**: Logo, email/password fields, "Sign In" button

#### 2. Room Creation/Join
**What to capture**: Lobby with room code input
**Steps**:
1. Sign in
2. Screenshot the lobby page
3. **Key elements**: "Enter your name" field, "Room Code" field, "Create/Join Room" button

#### 3. Planning Poker Interface
**What to capture**: Active voting session with story and vote cards
**Steps**:
1. Create a room
2. Add a story
3. Start voting
4. Screenshot the voting interface
5. **Key elements**: Story title, Fibonacci cards (1, 2, 3, 5, 8, 13), participant list

#### 4. Vote Results
**What to capture**: Revealed votes with results
**Steps**:
1. Cast votes from 2 browsers
2. Reveal votes
3. Screenshot the results page
4. **Key elements**: Vote distribution, agreed estimate, participant votes

#### 5. Kiro Specs Directory
**What to capture**: `.kiro/specs/` folder structure in VS Code
**Steps**:
1. Open project in VS Code
2. Expand `.kiro/specs/` folder
3. Show `domain.yaml`, `flows.yaml`, `connectors.yaml`
4. Screenshot the file tree
5. **Key elements**: Kiro folder structure, spec files

### Screenshot Best Practices

- **Resolution**: 1920x1080 or higher
- **Format**: PNG (lossless)
- **Clean UI**: Hide personal info, use demo data
- **Annotations**: Add arrows/highlights if needed (use Snagit, Greenshot, or built-in tools)
- **Consistency**: Same browser, same theme (light or dark)

### Tools for Screenshots

**Windows**:
- Win + Shift + S (Snipping Tool)
- Greenshot (free)
- ShareX (free, advanced)

**Mac**:
- Cmd + Shift + 4 (built-in)
- CleanShot X (paid, professional)

**Cross-platform**:
- Browser DevTools (F12) → Screenshot full page
- Snagit (paid, professional)

---

## Part 2: Demo Video Script (5 minutes)

### Video Structure

**Total Time**: 4-5 minutes  
**Format**: Screen recording with voiceover  
**Resolution**: 1920x1080, 30fps  
**File Format**: MP4 (H.264)

### Script Outline

#### Intro (30 seconds)
```
[Title Card: "Scrum Reborn - 99.5% Reliable Real-Time Scrum Collaboration"]

"Hi, I'm [Your Name], and this is Scrum Reborn - a reliable, real-time 
collaboration tool for distributed Scrum teams.

The problem: Our original app had a 50% connectivity failure rate due to 
peer-to-peer WebRTC limitations. Corporate firewalls and NAT traversal 
meant half our users couldn't connect.

The solution: We rebuilt it with AWS AppSync and DynamoDB, achieving 
99.5% connectivity - a 99x improvement."
```

#### Demo Flow (3 minutes)
```
[Screen: Sign-in page]
"Let me show you how it works. I'll sign in as Alice..."

[Screen: Lobby]
"...and create a room with code ABC123."

[Screen: Room with Alice]
"Now I'm in the room. Let me open a second browser as Bob..."

[Screen: Split view - Alice left, Bob right]
"...and join the same room. Notice how Bob appears instantly in Alice's 
participant list - that's our sub-250ms pub/sub latency."

[Screen: Alice creates story]
"Alice creates a story: 'Implement user authentication'..."

[Screen: Bob sees story appear]
"...and Bob sees it immediately. No refresh needed."

[Screen: Both cast votes]
"Now let's vote. Alice votes 5, Bob votes 8..."

[Screen: Vote count updates]
"...and the vote count updates in real-time. Our tally Lambda processes 
this in under 2 seconds."

[Screen: Alice reveals votes]
"Alice reveals the votes..."

[Screen: Both see results]
"...and both users see the results simultaneously. The agreed estimate 
is calculated automatically."
```

#### Kiro Integration (1 minute)
```
[Screen: VS Code with .kiro/specs/]
"What makes this special is our Kiro-first development approach. We 
defined our domain models, user flows, and SLIs in specs before writing 
any code."

[Screen: domain.yaml]
"Here's our domain spec - Room, Story, Vote, Presence entities..."

[Screen: flows.yaml]
"...and our user flows - authentication, room operations, voting..."

[Screen: Test results terminal]
"...which drove our automated tests. We have 69 tests covering backend 
Lambda functions and frontend React hooks, all passing in under 4 seconds."

[Screen: Architecture diagram]
"The architecture is fully serverless: AppSync for GraphQL, DynamoDB for 
data, Lambda for compute, and Cognito for auth."
```

#### Closing (30 seconds)
```
[Screen: Metrics dashboard or CloudWatch]
"We monitor four key SLIs: Vote Tally Latency under 2 seconds, Join 
Success Rate above 99.5%, Pub/Sub Latency under 250ms, and Presence 
Freshness under 30 seconds."

[Title Card: GitHub URL + Live Demo URL]
"Scrum Reborn is production-ready, fully tested, and deployed. Check out 
the code on GitHub and try the live demo. Thanks for watching!"
```

### Recording Tips

1. **Prepare Demo Data**:
   - Create test users: alice@scrumreborn.com, bob@scrumreborn.com
   - Pre-create room code: ABC123
   - Have stories ready to add

2. **Clean Your Screen**:
   - Close unnecessary tabs/windows
   - Hide bookmarks bar
   - Use incognito mode for clean browser
   - Disable notifications

3. **Practice First**:
   - Do a dry run without recording
   - Time yourself (aim for 4-5 minutes)
   - Smooth out any awkward pauses

4. **Recording Settings**:
   - 1920x1080 resolution
   - 30fps frame rate
   - High quality audio (use good mic)
   - Record system audio if showing interactions

### Tools for Video Recording

**Recommended: OBS Studio** (Free, Professional)
- Download: https://obsproject.com/
- Settings: 1920x1080, 30fps, MP4 output
- Scenes: Full screen, split screen, VS Code

**Alternative: Loom** (Free tier available)
- Web-based, easy to use
- Automatic upload to cloud
- Built-in editing tools

**Alternative: Camtasia** (Paid, Professional)
- Advanced editing features
- Annotations and callouts
- Professional transitions

### Video Editing (Optional)

**Basic Edits**:
- Trim start/end
- Remove mistakes/pauses
- Add title card at beginning
- Add end card with links

**Advanced Edits**:
- Add zoom effects for important UI elements
- Add text annotations
- Add background music (low volume)
- Add transitions between sections

**Free Editing Tools**:
- DaVinci Resolve (professional, free)
- OpenShot (simple, free)
- Shotcut (cross-platform, free)

---

## Part 3: Upload and Submission (15 minutes)

### YouTube Upload

1. **Go to**: https://studio.youtube.com/
2. **Click**: "Create" → "Upload videos"
3. **Select**: Your MP4 file
4. **Title**: "Scrum Reborn - 99.5% Reliable Real-Time Scrum | Kiroween Hackathon"
5. **Description**:
```
Scrum Reborn transforms planning poker and retrospectives with guaranteed 
99.5%+ connectivity. Built on AWS AppSync + DynamoDB, it eliminates the 
frustration of dropped P2P connections.

🔗 GitHub: https://github.com/[your-username]/scrum-reborn
🌐 Live Demo: https://scrum-reborn.vercel.app
📊 Architecture: AWS AppSync, DynamoDB, Lambda, Cognito
🧪 Tests: 69 automated tests (backend + frontend)
⚡ SLIs: <2s vote tally, <250ms pub/sub, 99.5%+ join success

Built with Kiro-first development: specs → code → tests

#Kiroween #Hackathon #AWS #Serverless #React #TypeScript
```
6. **Visibility**: Unlisted (or Public)
7. **Thumbnail**: Upload custom thumbnail (optional)
8. **Publish**: Click "Publish"
9. **Copy URL**: Save the YouTube URL for Devpost

### Devpost Submission

1. **Go to**: Devpost hackathon page
2. **Add Video**: Paste YouTube URL
3. **Add Screenshots**: Upload 5 PNG files
4. **Add Description**: Use template from HACKATHON-SUBMISSION-CHECKLIST.md
5. **Add Links**:
   - GitHub: https://github.com/[your-username]/scrum-reborn
   - Live Demo: https://scrum-reborn.vercel.app
6. **Add Built With**: AWS AppSync, DynamoDB, Lambda, Cognito, React, TypeScript, Kiro
7. **Preview**: Check how it looks
8. **Submit**: Click "Submit Project"

---

## Checklist

### Screenshots
- [ ] Authentication flow screenshot
- [ ] Room creation/join screenshot
- [ ] Planning poker interface screenshot
- [ ] Vote results screenshot
- [ ] Kiro specs directory screenshot
- [ ] All screenshots are 1920x1080 or higher
- [ ] All screenshots are PNG format
- [ ] No personal information visible

### Video
- [ ] Script written and practiced
- [ ] Demo environment prepared (test users, room code)
- [ ] Screen cleaned (no distractions)
- [ ] Video recorded (4-5 minutes)
- [ ] Audio is clear and audible
- [ ] Video edited (trim, title card, end card)
- [ ] Video exported as MP4 (1920x1080, 30fps)
- [ ] Video uploaded to YouTube
- [ ] YouTube URL copied

### Submission
- [ ] Devpost account created
- [ ] Video URL added
- [ ] Screenshots uploaded
- [ ] Description filled in
- [ ] Links added (GitHub, live demo)
- [ ] Built With tags added
- [ ] Preview checked
- [ ] Project submitted

---

**Estimated Total Time**: 1-2 hours  
**Priority**: HIGH (required for submission)  
**Status**: Ready to execute

**Next Steps**: Start with screenshots (30 min), then video (1 hour), then upload (15 min)
