# 🎬 Complete Video Recording Guide - Scrum Reborn Hackathon Submission

**Status:** Ready to record | **Estimated Time:** 4-5 hours total | **Target:** 5-minute demo video

---

## ✅ What's Already Done (Automation Complete)

### Security & Code Quality ✅
- [x] Security audit passed - No exposed credentials
- [x] TODO comments removed from code
- [x] README.md updated with correct URLs
- [x] LICENSE file verified (MIT)
- [x] Git commits pushed to main branch

### Documentation Ready ✅
- [x] **Devpost submission text:** `docs/hackathon/DEVPOST-SUBMISSION-FINAL.md` (1,500 words)
- [x] **Video script:** `docs/hackathon/DEMO-VIDEO-OUTLINE-SCRIPT.md` (5 minutes)
- [x] **Metrics proof:** `docs/metrics/RELIABILITY-METRICS.md` (99x improvement math)
- [x] **Professional slides:** `docs/hackathon/slides/slide1-9.jpg` (9 beautiful slides!)
- [x] **Pre-recording checklist:** `docs/hackathon/PRE-RECORDING-CHECKLIST.md`

### Live Demo ✅
- [x] **URL accessible:** https://main.d3tvb88c55agb4.amplifyapp.com
- [x] Auto-deploy enabled (Amplify)
- [x] Latest code deployed

---

## 🎯 Your Complete Roadmap (4-5 Hours to Submission)

### Phase 1: Pre-Recording Setup (1 hour)

#### Task 1.1: Configure GitHub Repository (5 minutes)
**Action:** Run the setup script or configure manually

```bash
# Option A: Automated (requires GitHub CLI)
bash docs/hackathon/GITHUB-SETUP-COMMANDS.sh

# Option B: Manual - Go to https://github.com/sgharlow/scrum-web-reborn/settings
# Set:
# - Description: "99x more reliable real-time Scrum collaboration with AWS AppSync - Planning poker and retrospectives that just work"
# - Website: https://main.d3tvb88c55agb4.amplifyapp.com
# - Topics: aws, appsync, dynamodb, hackathon, kiro, scrum, planning-poker, typescript, react, graphql, serverless, real-time
```

**Verify:** Visit your GitHub repo - description and topics should be visible

---

#### Task 1.2: Test Live Demo End-to-End (15 minutes)
**Reference:** `docs/hackathon/PRE-RECORDING-CHECKLIST.md` Section 2

**Critical Test Flow:**
1. **Open incognito window:** https://main.d3tvb88c55agb4.amplifyapp.com
2. **Sign up:** Use `yourname+test1@gmail.com` (+ trick for multiple accounts)
3. **Confirm account:** Check email (including spam folder)
4. **Sign in:** Verify login works
5. **Create room:** Name: "Sprint 42 Planning" - Note the 6-character code
6. **Second window:** Open another incognito OR use phone
7. **Join room:** Use the room code from step 5
8. **Verify presence:** Both windows show participants
9. **Create story:** "Test AppSync reliability"
10. **Cast votes:** Different values in each window
11. **Reveal votes:** Verify results show correctly with average
12. **Check console:** Press F12 - NO RED ERRORS should appear
13. **Test retro:** Change stage to RETRO, add note, upvote from other window

**If any step fails:** Fix before recording! Judges will test this exact flow.

---

#### Task 1.3: Review Your Demo Slides ✅ ALREADY CREATED!
**Location:** `docs/hackathon/slides/slide1.jpg` through `slide9.jpg`

**You have 9 professional slides ready to use:**

| File | Slide Title | Content |
|------|-------------|---------|
| `slide1.jpg` | Title | "Scrum Reborn - 99x more reliable" with team illustration |
| `slide2.jpg` | The Challenge | P2P WebRTC problems - 50% Failure Rate (red cards) |
| `slide3.jpg` | The Solution | AWS AppSync Architecture - 99.5% / 99x Improvement |
| `slide4.jpg` | Before & After | Side-by-side comparison table |
| `slide5.jpg` | Kiro Methodology | Spec-Driven Development process |
| `slide6.jpg` | Metrics | 99.7%, 180ms, 1.2s, 100% production impact |
| `slide7.jpg` | Architecture | Deep dive - 5 technical components |
| `slide8.jpg` | Try It Today | Live demo URL, GitHub, "Built with Kiro" |
| `slide9.jpg` | Questions | Next steps and call to action |

**Pre-Recording Action (5 minutes):**
1. Open each slide in an image viewer to familiarize yourself
2. Practice the transition order: 1 → 2 → 3 → [Live Demo] → 4 → 5 → 6 → 7 → 8 → 9
3. Keep slides open in a separate window for easy switching during recording

**Slide Usage During Video:**
- **0:00-0:10**: Slide 1 (Title) - Introduction
- **0:10-0:30**: Slide 2 (Challenge) - Explain P2P problems
- **0:30-1:30**: Slide 3 + 7 (Solution + Architecture) - Explain AppSync
- **1:30-3:30**: **LIVE DEMO** (no slides - screen recording of app)
- **3:30-4:00**: Slide 4 (Before/After) - Show transformation
- **4:00-4:30**: Slide 5 (Kiro) + show `.kiro/` directory in VS Code
- **4:30-4:50**: Slide 6 (Metrics) - Prove impact
- **4:50-5:00**: Slide 8 + 9 (Try It + Questions) - Call to action

---

#### Task 1.4: Prepare Demo Room Data (10 minutes)

**Create demo room with realistic data:**
1. Sign in to https://main.d3tvb88c55agb4.amplifyapp.com
2. Create room with code: `KIRO24` (or any memorable code)
3. Add 2-3 sample stories:
   - "User can join rooms with 99.5% success rate"
   - "Implement DynamoDB single-table design"
   - "Add real-time presence tracking with TTL"
4. **Don't cast votes yet** - do this live during recording
5. Keep this tab open for recording

---

#### Task 1.5: Set Up Recording Software (20 minutes)

**Choose your recording tool:**

**Option A: Loom (Easiest)**
- Go to loom.com → Free account
- Install browser extension
- Click record → Select screen + camera (optional)
- Built-in editing and hosting

**Option B: OBS Studio (Professional)**
- Download: https://obsproject.com/
- Settings → Video → Base Resolution: 1920x1080
- Settings → Output → Recording Quality: High Quality
- Add source → Display Capture

**Option C: Windows Built-in (Quick)**
- Press Win+G (Game Bar)
- Click record button
- No editing features

**Test recording:**
1. Record 10 seconds of your desktop
2. Play back - verify quality
3. Check audio levels (speak normally)
4. Adjust microphone distance (6-8 inches)

**Environment preparation:**
- [ ] Close all unnecessary apps and browser tabs
- [ ] Disable notifications (Windows: Do Not Disturb mode)
- [ ] Close Slack, email, Discord
- [ ] Clear browser history/cookies for clean demo
- [ ] Set browser zoom to 100%
- [ ] Position windows for easy switching

---

### Phase 2: Record Video (2-3 hours)

#### Your 5-Minute Video Structure
**Reference:** `docs/hackathon/DEMO-VIDEO-OUTLINE-SCRIPT.md` (full script)

**Minute 0:00-0:30 - Hook & Problem (30 seconds)**
- **Visual:** Title slide → Problem slide (P2P diagram)
- **Key message:** "50% connectivity failure rate"
- **Script highlights:**
  - "Distributed Scrum teams need reliable planning tools"
  - "Our original P2P app failed 50% of the time"
  - "NAT traversal, firewalls, TURN servers = frustration"

**Minute 0:30-1:30 - Solution Architecture (60 seconds)**
- **Visual:** Solution slide (AppSync diagram)
- **Key message:** "99.5% success = 99x improvement"
- **Script highlights:**
  - "We replaced P2P with AWS AppSync and DynamoDB"
  - "HTTPS on port 443 - no NAT traversal needed"
  - "99.5% connectivity = 99x improvement"
  - "Built using Kiro-first development"

**Minute 1:30-3:30 - Live Demo (120 seconds)**
- **Visual:** Screen recording of live app
- **Demo flow:**
  1. **Room Creation (30s):** Create "Sprint 42 Planning", show code KIRO24
  2. **Join (20s):** Join from second device/window, show presence sync
  3. **Story Voting (60s):** Add story, both cast votes, show tally processing, reveal votes
  4. **Retro (30s):** Switch to retro mode, add note, upvote from other device
- **Key points to emphasize:**
  - "Under 2 seconds to join"
  - "Sub-250 millisecond latency for real-time sync"
  - "Everything syncs. Everything works."

**Minute 3:30-4:30 - Kiro Integration (60 seconds)**
- **Visual:** Screen recording of `.kiro/` directory in VS Code
- **Show:**
  - `.kiro/specs/` directory structure
  - Open `domain.yaml` briefly
  - Open `appsync-infrastructure/requirements.md` and scroll
  - Show `hooks/` directory
  - Open `steering/foundation.md`
- **Key message:** "This isn't just code. It's a methodology."

**Minute 4:30-5:00 - Impact & Call to Action (30 seconds)**
- **Visual:** Metrics slide → Call to Action slide
- **Key message:** "99x improvement - teams can finally trust their tools"
- **Script highlights:**
  - "From 50% to 99.5% connectivity"
  - "Sub-250ms latency, under 2s tallying"
  - "Try it at [live URL]"
  - "Code is open source on GitHub"
  - "Built with Kiro - Specs before code"

---

#### Recording Tips

**Audio Quality:**
- Use external microphone if possible
- Quiet room, no background noise
- 6-8 inches from mic
- Speak clearly, moderate pace
- Enthusiastic but not over-the-top

**Video Quality:**
- 1920x1080 resolution minimum
- 30fps frame rate
- Full screen or maximized windows
- Clean desktop (no clutter)
- Use cursor highlighting if available

**Presentation Tips:**
- Don't memorize - know your talking points
- Pause between sections (easier to edit)
- If you make a mistake, pause 3 seconds and restart that sentence
- Show enthusiasm for your project
- Emphasize "99x improvement" multiple times

**Common Mistakes to Avoid:**
- ❌ Reading from script robotically
- ❌ Rushing through demo
- ❌ Forgetting to show live URL
- ❌ Not emphasizing key metrics
- ❌ Low energy/monotone voice

---

#### Recording Checklist

**Immediately before recording:**
- [ ] Use bathroom (don't interrupt!)
- [ ] Get water (hydrated voice)
- [ ] Close all apps except necessary ones
- [ ] Turn phone to airplane mode
- [ ] Set computer to Do Not Disturb
- [ ] Test live demo one more time (30 seconds)
- [ ] Position slides for easy access
- [ ] Clear throat, take deep breath
- [ ] Start recording
- [ ] Count to 3 silently (gives editing buffer)
- [ ] Begin with confidence!

---

### Phase 3: Edit & Upload (30 minutes)

#### Editing (20 minutes)

**Basic Editing (Loom/built-in):**
1. Trim start/end (remove countdown, mistakes)
2. Cut out long pauses (loading times, mistakes)
3. Verify all key points covered

**Advanced Editing (if using OBS → video editor):**
1. Remove mistakes and long pauses
2. Add title card: "Scrum Reborn - 99x More Reliable Real-Time Scrum Collaboration"
3. Add end card with URLs:
   - Live Demo: main.d3tvb88c55agb4.amplifyapp.com
   - GitHub: github.com/sgharlow/scrum-web-reborn
4. Add captions/subtitles (YouTube auto-captions work)
5. Check audio levels are consistent

**Export Settings:**
- Format: MP4
- Resolution: 1920x1080
- Codec: H.264
- Frame rate: 30fps

---

#### Upload to YouTube (10 minutes)

**Steps:**
1. Go to youtube.com → Sign in
2. Click "Create" → "Upload video"
3. Select your exported video file
4. **Title:** "Scrum Reborn - Real-Time Scrum Collaboration with AWS AppSync"
5. **Description:**
   ```
   Scrum Reborn: 99x more reliable real-time collaboration for distributed Scrum teams

   Live Demo: https://main.d3tvb88c55agb4.amplifyapp.com
   GitHub: https://github.com/sgharlow/scrum-web-reborn

   Built with AWS AppSync, DynamoDB, Lambda, and Cognito using Kiro's spec-driven development methodology.

   Hackathon submission demonstrating:
   - 99x improvement in connectivity (50% → 99.5%)
   - Sub-250ms real-time synchronization
   - Production-ready architecture with monitoring
   - 111 automated tests
   ```
6. **Visibility:** 🚨 **UNLISTED** (NOT Private!) 🚨
7. **Tags:** scrum, aws, appsync, dynamodb, hackathon, kiro, planning-poker
8. Click "Publish"
9. **CRITICAL:** Copy the YouTube URL (you'll need it for Devpost)
10. **TEST:** Open URL in incognito window to verify it's accessible

---

### Phase 4: Screenshots (30 minutes)

**Take 8 high-quality screenshots on live URL:**

**On your live app (https://main.d3tvb88c55agb4.amplifyapp.com):**
1. **Sign-in page** - Clean, professional landing page
2. **Room lobby** - Showing room code and participants list
3. **Planning poker - Voting** - Votes hidden, in progress
4. **Planning poker - Revealed** - Results showing average
5. **Retrospective board** - Notes in three categories
6. **Multi-device sync** - Split-screen or photo of two devices side-by-side

**In your development environment:**
7. **`.kiro/` directory** - VS Code file explorer showing folder structure
8. **Amplify deployment** - AWS Amplify Console showing successful deployment

**Screenshot Tool:**
- Windows: Win+Shift+S (Snipping Tool)
- Mac: Cmd+Shift+4
- **Save as:** PNG format, high quality
- **Resolution:** 1920x1080 or similar
- **Naming:** `01-signin.png`, `02-lobby.png`, etc.

---

### Phase 5: Update Devpost Submission Text (10 minutes)

1. **Open:** `docs/hackathon/DEVPOST-SUBMISSION-FINAL.md`
2. **Find line:** `- **Demo Video**: [Add YouTube URL after recording]`
3. **Replace with:** Your actual YouTube URL
4. **Save the file**
5. **Commit to git:**
   ```bash
   git add docs/hackathon/DEVPOST-SUBMISSION-FINAL.md
   git commit -m "Add demo video URL to submission"
   git push
   ```

---

### Phase 6: Submit to Devpost (30 minutes)

#### Pre-Submission Final Checklist (10 minutes)

**Test everything one more time:**
- [ ] Open live demo in incognito → test full flow (5 min)
- [ ] Open GitHub repo as non-logged-in user → looks professional (2 min)
- [ ] Watch your video one more time → compelling? (1 min)
- [ ] Review screenshots → tell the story? (1 min)
- [ ] Verify video is "Unlisted" on YouTube (1 min)
- [ ] Click all links in submission text → they work? (2 min)

---

#### Devpost Submission Form (20 minutes)

**Reference:** `docs/hackathon/DEVPOST-SUBMISSION-FINAL.md` (full text ready to copy/paste)

**Step-by-step:**

1. **Go to hackathon submission page** (find the specific hackathon on Devpost)

2. **Project Name:** Scrum Reborn

3. **Tagline:** 99x more reliable real-time Scrum collaboration

4. **Copy/paste these sections from DEVPOST-SUBMISSION-FINAL.md:**
   - Inspiration (paragraph 1)
   - What it does (paragraph 2 + bullet list)
   - How we built it (architecture section)
   - Challenges we ran into (5 challenges)
   - Accomplishments (6 accomplishments)
   - What we learned (5 learnings)
   - What's next (roadmap)

5. **Built With tags:**
   - aws-appsync
   - aws-cdk
   - aws-lambda
   - dynamodb
   - cognito
   - cloudwatch
   - aws-amplify
   - react
   - typescript
   - graphql
   - vite
   - nodejs
   - kiro

6. **Try it out:**
   - **Live Demo:** https://main.d3tvb88c55agb4.amplifyapp.com
   - **GitHub:** https://github.com/sgharlow/scrum-web-reborn
   - **Demo Video:** [Your YouTube URL]

7. **Upload 8 screenshots** (drag and drop in order)

8. **Team Members:**
   - Add yourself with your role: "Full-stack developer, AWS architect, Scrum practitioner"

9. **Submission Category:**
   - Resurrection (if available)
   - Best Use of AWS
   - Best Use of Kiro

10. **Review everything:**
    - Spell check
    - Grammar check
    - Links work
    - Screenshots uploaded
    - Video accessible

11. **SUBMIT!** 🚀

---

## 🏆 Your Competitive Advantages (Remember These!)

**What you have that 99% of hackathon projects don't:**
- ✅ **Live demo that actually works** - Judges can test it right now
- ✅ **Quantifiable metrics** - 99x improvement with math to prove it
- ✅ **111 automated tests** - Production-ready quality
- ✅ **Complete documentation** - 25+ markdown files
- ✅ **Kiro methodology** - Spec-driven development done right
- ✅ **Production architecture** - CloudWatch monitoring, alarms, DLQ
- ✅ **Open source** - Full transparency, judges can inspect everything

**What most hackathon projects have:**
- ❌ Broken demo or no demo at all
- ❌ Vague claims with no proof
- ❌ No tests
- ❌ Minimal or no documentation
- ❌ Sloppy code thrown together
- ❌ No monitoring or error handling

**Your killer differentiator:** "99x improvement" - most projects can't quantify their impact!

---

## ⚠️ Critical Reminders

### Top 3 Things That Could Disqualify You:
1. **Live demo not working** - Test it RIGHT before submitting
2. **YouTube video is "Private"** - Must be "Unlisted" or "Public"
3. **Links are broken** - Click every link in your submission

### Backup Plans:
- **If live demo breaks during recording:** Use localhost recording, fix deploy later
- **If video recording fails:** Use slides + voiceover explaining screenshots
- **If you run out of time:** Submit with partial video, update later if allowed

---

## ⏰ Time Budget Summary

| Phase | Tasks | Time |
|-------|-------|------|
| **Phase 1** | GitHub setup, test demo, review slides ✅, prepare room, setup recording | **45 min** |
| **Phase 2** | Record 5-minute video (multiple takes likely) | **1.5-2 hours** |
| **Phase 3** | Edit and upload to YouTube | **30 min** |
| **Phase 4** | Take 8 screenshots | **30 min** |
| **Phase 5** | Update submission text with video URL | **10 min** |
| **Phase 6** | Final checks and Devpost submission | **30 min** |
| **TOTAL** | | **3.5-4.5 hours** |

**Note:** Slides are already created (slide1-9.jpg) - saving you 20+ minutes!

---

## 📁 Quick Reference: Key Files

| File | Purpose | Location |
|------|---------|----------|
| **Professional slides** | 9 ready-to-use slides | `docs/hackathon/slides/slide1-9.jpg` |
| **Video script** | Your speaking points | `docs/hackathon/DEMO-VIDEO-OUTLINE-SCRIPT.md` |
| **Submission text** | Copy/paste into Devpost | `docs/hackathon/DEVPOST-SUBMISSION-FINAL.md` |
| **Metrics proof** | 99x improvement math | `docs/metrics/RELIABILITY-METRICS.md` |
| **Pre-recording checklist** | Detailed prep tasks | `docs/hackathon/PRE-RECORDING-CHECKLIST.md` |
| **GitHub setup** | Repo configuration | `docs/hackathon/GITHUB-SETUP-COMMANDS.sh` |

---

## 🎯 Start Right Now!

**Your immediate next steps:**

1. **Configure GitHub (5 min):**
   ```bash
   bash docs/hackathon/GITHUB-SETUP-COMMANDS.sh
   ```

2. **Test live demo (15 min):** Follow test flow in Task 1.2 above

3. **Review your slides (5 min):** Open `docs/hackathon/slides/slide1-9.jpg` ✅ Already created!

4. **Set up recording (20 min):** Install Loom or OBS, test audio/video

5. **Record video (2 hours):** Follow script in `DEMO-VIDEO-OUTLINE-SCRIPT.md`

6. **Finish strong (1 hour):** Edit, upload, screenshots, submit

---

## 💡 Final Pro Tips

1. **Don't aim for perfection** - Good enough is better than perfect-but-never-finished
2. **Emphasize the 99x** - Say it multiple times in your video
3. **Show don't tell** - Live demo is more convincing than words
4. **Test before you submit** - Judges will try your demo immediately
5. **Have fun!** - Your enthusiasm will show through

---

## ✨ You've Got This!

**Everything is ready:**
- ✅ Code is production-ready
- ✅ Documentation is comprehensive
- ✅ Submission text is polished
- ✅ Metrics are proven
- ✅ Live demo works

**Now just execute:**
1. Record the video (2-3 hours)
2. Take screenshots (30 min)
3. Submit (30 min)

**Total time to hackathon glory: 4-5 hours**

---

**🚀 START NOW! Open `docs/hackathon/slides/QUICK-START-SLIDES.md` and create your first slide!**

**Good luck! This is going to be an amazing submission! 🏆**
