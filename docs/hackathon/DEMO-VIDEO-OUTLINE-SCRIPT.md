# Demo Video Outline & Script

**Duration**: 5 minutes  
**Format**: Screen recording + voiceover  
**Tools**: OBS Studio, Loom, or QuickTime Screen Recording

---

## Pre-Recording Checklist

### Technical Setup

- [ ] Clean browser windows (close unnecessary tabs)
- [ ] Clear browser cache and cookies
- [ ] Prepare two devices/browsers for multi-device demo
- [ ] Test microphone audio quality
- [ ] Close notification apps (Slack, email, etc.)
- [ ] Set "Do Not Disturb" mode
- [ ] Prepare demo data (test users, sample room)
- [ ] Test screen recording software
- [ ] Verify internet connection stable

### Visual Preparation

- [ ] Prepare slides/diagrams:
  - Problem slide (P2P architecture with failure points)
  - Solution slide (AppSync architecture)
  - Kiro artifacts screenshot
  - SLI metrics dashboard (or mockup)
- [ ] Prepare demo room with code: `KIRO24`
- [ ] Prepare sample stories ready to vote on
- [ ] Set browser zoom to 100% for readability

### Demo Accounts

- [ ] User 1: `alice@demo.local` / `Demo1234!` (Moderator)
- [ ] User 2: `bob@demo.local` / `Demo1234!` (Member)

---

## Video Structure

### Minute 0:00-0:30 - Hook & Problem (30 seconds)

**Visual**: Title slide → P2P architecture diagram with red X's

**Script**:
```
"Distributed Scrum teams need reliable planning tools. But our original app 
had a critical problem: 50% connectivity failure rate.

[Show P2P diagram]

Why? Peer-to-peer WebRTC requires NAT traversal. Corporate firewalls, 
restrictive networks, and unreliable TURN servers meant half our users 
couldn't connect. Mid-sprint, votes would drop. Frustration everywhere.

We needed a solution that just works."
```

**Timing**: 30 seconds  
**Pace**: Moderate, emphasize "50% failure" and "frustration"

---

### Minute 0:30-1:30 - Solution Architecture (60 seconds)

**Visual**: AppSync architecture diagram → Highlight key components

**Script**:
```
"Enter Scrum Reborn: We replaced peer-to-peer with AWS AppSync and DynamoDB.

[Show AppSync diagram]

Here's how it works:
- All communication goes through HTTPS on port 443. No NAT traversal needed.
- AppSync provides managed WebSocket subscriptions for real-time updates.
- DynamoDB stores everything with guaranteed consistency.
- Lambda functions handle business logic and vote tallying.
- Cognito manages authentication.

The result? 99.5% connectivity. That's a 99x improvement in reliability.

[Highlight numbers]

And we built this using Kiro-first development. Specs before code. 
Automated testing. Measurable SLIs."
```

**Timing**: 60 seconds  
**Pace**: Slightly faster, technical but clear  
**Key Points**: Emphasize "99.5%", "99x improvement", "Kiro-first"

---

### Minute 1:30-3:30 - Live Demo (120 seconds)

**Visual**: Split screen or picture-in-picture showing two devices

#### Part 1: Room Creation & Join (30 seconds)

**Script**:
```
"Let me show you how it works. I'm Alice, the Scrum Master.

[Device A: Create room]

I create a room called 'Sprint 42 Planning' with code KIRO24.

[Device B: Join room]

Bob joins from his phone using the code. Watch the speed...

[Show both screens]

Under 2 seconds. And look - we both see each other instantly. 
Real-time presence tracking with 30-second heartbeats."
```

**Actions**:
- Device A: Click "Create Room" → Enter "Sprint 42 Planning" → Code "KIRO24" → Create
- Device B: Click "Join Room" → Enter "KIRO24" → Display name "Bob" → Join
- Show both participant lists updating

**Timing**: 30 seconds  
**Key Metric**: <2s join time

---

#### Part 2: Story Voting (60 seconds)

**Script**:
```
"Now let's estimate a story. I'll add one about our AppSync migration.

[Device A: Create story]

'User can join rooms with 99.5% success rate.'

[Show story appears on Device B]

Bob sees it instantly. Now we vote. I'll vote 5 story points.

[Device A: Vote 5]

Bob votes 8. Watch the vote count update...

[Show vote count: 2 votes]

Under 2 seconds for the tally to compute. That's our DynamoDB Streams 
processor in action.

Now I'll reveal the votes.

[Device A: Reveal]

Boom. Both devices see the results simultaneously. Average: 6.5 points.

[Show both screens with revealed votes]

Sub-250 millisecond latency for real-time sync."
```

**Actions**:
- Device A: Add story → Title: "User can join rooms with 99.5% success"
- Device B: Verify story appears
- Device A: Vote "5"
- Device B: Vote "8"
- Show vote count updating
- Device A: Click "Reveal Votes"
- Show both devices with revealed votes

**Timing**: 60 seconds  
**Key Metrics**: <250ms sync, <2s tally

---

#### Part 3: Retrospective (30 seconds)

**Script**:
```
"After planning, we do retro. I'll switch to retro mode.

[Device A: Change stage to RETRO]

Bob's screen updates automatically. I'll add a note about what went well.

[Device A: Add retro note]

'AppSync eliminated NAT traversal issues.'

[Show note appears on Device B]

Bob upvotes it. The vote count increments in real-time.

[Device B: Upvote]

Everything syncs. Everything works. No dropped connections."
```

**Actions**:
- Device A: Change room stage to "RETRO"
- Device B: Verify UI switches to retro mode
- Device A: Add retro note → Category "WENT_WELL" → Text "AppSync eliminated NAT traversal issues"
- Device B: Verify note appears
- Device B: Click upvote
- Device A: Verify vote count increments

**Timing**: 30 seconds

---

### Minute 3:30-4:30 - Kiro Integration (60 seconds)

**Visual**: Screen recording of `.kiro/` directory → Show spec files

**Script**:
```
"What makes this special is our Kiro-first approach.

[Show .kiro/specs/ directory]

We started with specs, not code. Here's our domain model defining entities, 
SLIs, and business rules.

[Show domain.yaml]

Our flows document user journeys and event choreography.

[Show flows.yaml]

We defined connectors for Domo dashboards and CloudWatch monitoring.

[Show connectors.yaml]

Then we created a complete infrastructure spec with requirements, design, 
and implementation tasks.

[Show appsync-infrastructure/ directory]

Every requirement follows EARS syntax. Every task references requirements. 
Specs drove development.

[Show hooks/]

We automated testing with hooks. This nightly probe runs end-to-end tests 
daily, measuring our SLIs.

[Show steering/foundation.md]

And we documented our principles: tone, naming conventions, UX guidelines, 
error handling philosophy.

This isn't just code. It's a methodology."
```

**Actions**:
- Navigate to `.kiro/specs/` directory
- Open `domain.yaml` briefly
- Open `flows.yaml` briefly
- Open `connectors.yaml` briefly
- Show `appsync-infrastructure/` directory structure
- Open `requirements.md` and scroll
- Show `hooks/` directory
- Open `steering/foundation.md` and scroll

**Timing**: 60 seconds  
**Pace**: Moderate, let viewers see file contents

---

### Minute 4:30-5:00 - Impact & Call to Action (30 seconds)

**Visual**: Metrics dashboard (or slide with key numbers) → GitHub repo → Live demo URL

**Script**:
```
"Let's talk impact.

[Show metrics]

From 50% to 99.5% connectivity. That's a 99x improvement in reliability.
Sub-250 millisecond latency for real-time updates.
Under 2 seconds for vote tallying.

Teams can finally trust their planning tools.

[Show GitHub repo]

The code is open source on GitHub. Everything you saw - the CDK infrastructure, 
the Lambda functions, the Kiro specs - it's all there.

[Show live demo URL]

Try it yourself at scrum-reborn.demo.com. Create a room. Invite your team. 
See the difference.

[Show Kiro logo]

Built with Kiro. Specs before code. Automated quality. Measurable impact.

Scrum Reborn: Reliable real-time collaboration for distributed teams."
```

**Actions**:
- Show metrics slide or dashboard
- Show GitHub repository page
- Show live demo URL
- End with title card: "Scrum Reborn - Built with Kiro"

**Timing**: 30 seconds  
**Pace**: Confident, inspiring

---

## Recording Tips

### Audio

- **Microphone**: Use external mic if possible (Blue Yeti, Rode, etc.)
- **Environment**: Quiet room, no background noise
- **Distance**: 6-8 inches from mic
- **Volume**: Test levels, avoid clipping
- **Pacing**: Speak clearly, moderate pace, pause between sections
- **Energy**: Enthusiastic but not over-the-top

### Video

- **Resolution**: 1920x1080 minimum
- **Frame Rate**: 30fps minimum
- **Screen**: Clean desktop, close unnecessary apps
- **Browser**: Full screen or maximized window
- **Zoom**: 100% browser zoom for readability
- **Cursor**: Use cursor highlighting if available
- **Transitions**: Smooth, not jarring

### Editing

- **Cuts**: Remove long pauses, mistakes, loading times
- **Captions**: Add subtitles for accessibility
- **Music**: Optional background music (low volume, non-distracting)
- **Branding**: Add title card at start and end
- **Export**: MP4 format, H.264 codec, 1920x1080, 30fps

---

## B-Roll Footage (Optional)

If you have extra time, record these for editing flexibility:

- [ ] Architecture diagrams (slow pan/zoom)
- [ ] Code editor showing key files
- [ ] Terminal showing deployment commands
- [ ] CloudWatch dashboard with metrics
- [ ] Multiple browser windows showing sync
- [ ] Mobile device joining room

---

## Post-Recording Checklist

- [ ] Watch full video for errors
- [ ] Check audio levels consistent
- [ ] Verify all key points covered
- [ ] Add captions/subtitles
- [ ] Add title card and end card
- [ ] Export in correct format
- [ ] Upload to YouTube (unlisted or public)
- [ ] Test video playback
- [ ] Copy video URL for submission

---

## Alternative: Shorter 3-Minute Version

If 5 minutes is too long, use this condensed structure:

### Minute 0:00-0:20 - Problem (20s)
- Quick problem statement
- Show P2P failure rate

### Minute 0:20-0:50 - Solution (30s)
- AppSync architecture
- Key benefits
- 99x improvement

### Minute 0:50-2:20 - Live Demo (90s)
- Create room + join (20s)
- Vote + reveal (40s)
- Retro (30s)

### Minute 2:20-2:50 - Kiro Integration (30s)
- Show specs directory
- Mention hooks and steering
- Emphasize methodology

### Minute 2:50-3:00 - Call to Action (10s)
- GitHub link
- Live demo URL
- "Built with Kiro"

---

## Script Variations

### For Technical Audience

Emphasize:
- DynamoDB single-table design
- Lambda event source mapping with DLQ
- AppSync subscription filters
- CloudWatch custom metrics
- Infrastructure as code with CDK

### For Business Audience

Emphasize:
- 99x reliability improvement
- Cost savings (no TURN infrastructure)
- Team productivity gains
- Measurable SLIs
- Production-ready solution

### For Hackathon Judges

Emphasize:
- Kiro-first development
- Specs before code
- Automated testing with hooks
- Real problem solved
- Open source contribution

---

## Backup Plan

If live demo fails during recording:

1. **Use pre-recorded demo footage** (record successful run beforehand)
2. **Show screenshots** with voiceover explaining flow
3. **Use test environment** instead of production
4. **Acknowledge issue** and show CloudWatch logs proving it works

---

**Script Version**: 1.0  
**Created**: 2025-11-14  
**Target Duration**: 5 minutes  
**Status**: Ready for Recording
