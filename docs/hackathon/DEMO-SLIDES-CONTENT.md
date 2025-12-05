# Demo Video Slides - Content & Design Guide

**Purpose:** Visual aids for your 5-minute demo video
**Tool Suggestions:** PowerPoint, Google Slides, or Canva
**Resolution:** 1920x1080 (16:9 aspect ratio)

---

## Slide 1: Title Slide (0:00-0:10)

### Content:
```
Scrum Reborn

99x More Reliable Real-Time Scrum Collaboration

Built with AWS AppSync
```

### Design Notes:
- **Background:** Dark gradient (navy to black)
- **Title:** Large, bold white text
- **Subtitle:** "99x More Reliable" in bright green
- **Bottom:** AWS AppSync logo (if available) or text
- **Style:** Professional, modern, tech-focused

### When to Show:
- First 5-10 seconds of video
- Use as intro while you start speaking

---

## Slide 2: The Problem - P2P Architecture (0:10-0:30)

### Content:
```
The Problem: P2P WebRTC Architecture

[Diagram showing:]
User A ----X----> NAT Router ----X----> User B
         (Blocked)            (Failed)

Failure Points:
❌ NAT Traversal Issues (30% failure)
❌ Corporate Firewalls (15% failure)
❌ TURN Server Unreliable (5% failure)

Result: 50% CONNECTION FAILURE RATE
```

### Design Notes:
- **Background:** Light gray or white
- **Failure rate:** Large red text "50%" with ❌ symbols
- **Diagram:** Simple arrows with red X's showing blocked connections
- **Color scheme:** Red for failures, black for text
- **Icons:** Use ❌ emoji or red X symbols

### Visual Elements:
```
[User Icon] --X--> [Firewall] --X--> [User Icon]
                 BLOCKED          FAILED
```

### Key Message:
**"P2P = 50% Failure Rate"** in large red text at bottom

---

## Slide 3: The Solution - AppSync Architecture (0:30-1:00)

### Content:
```
The Solution: AWS AppSync Architecture

[Diagram showing:]
User A ---------> AppSync ---------> User B
  ✓            (Port 443)          ✓
  ✓         ┌─> Lambda            ✓
  ✓         └─> DynamoDB          ✓

Benefits:
✅ HTTPS on Port 443 (No NAT issues)
✅ AWS Managed Infrastructure
✅ WebSocket Subscriptions
✅ Guaranteed Delivery

Result: 99.5% CONNECTION SUCCESS RATE

🎉 99x IMPROVEMENT!
```

### Design Notes:
- **Background:** White or light blue
- **Success rate:** Large green text "99.5%" with ✅ symbols
- **Diagram:** Clean arrows showing data flow
- **Color scheme:** Green for success, blue for AWS services
- **Badge:** Big "99x IMPROVEMENT" in gold/yellow circle at bottom

### Visual Elements:
```
[User] ──✓──> [AppSync] ──✓──> [User]
                 │
                 ├──> [Lambda]
                 └──> [DynamoDB]
```

### Key Message:
**"99x IMPROVEMENT!"** in large gold/green text with celebration emoji

---

## Slide 4: Architecture Deep Dive (1:00-1:30)

### Content:
```
Serverless Architecture

┌─────────────┐
│   React 19  │
│  TypeScript │
└──────┬──────┘
       │ GraphQL/WebSocket
       ▼
┌─────────────┐
│ AWS AppSync │ ← Real-time subscriptions
└──────┬──────┘
       │
       ├──> Lambda Functions (Mutations)
       │
       └──> DynamoDB Single Table
             │
             └──> DynamoDB Streams
                    │
                    └──> Tally Lambda

99.5% Connectivity • <250ms Latency • <2s Tally
```

### Design Notes:
- **Background:** White with light AWS orange accents
- **Diagram:** Vertical flow chart
- **Colors:** Orange for AWS, blue for data flow
- **Metrics:** Bold at bottom in green boxes
- **Style:** Clean, technical diagram

---

## Slide 5: Before vs After Comparison (3:30-4:00)

### Content:
```
Before vs After

P2P WebRTC               AWS AppSync
─────────────           ─────────────
❌ 50% Success          ✅ 99.5% Success
❌ NAT Issues           ✅ Works Everywhere
❌ Firewall Blocked     ✅ Port 443 Only
❌ $50/mo (TURN)        ✅ $20/mo (AWS)
❌ 5hr/week Maint.      ✅ Zero Maintenance

           99x MORE RELIABLE
```

### Design Notes:
- **Background:** Split screen - red/left, green/right
- **Left side:** Red background, failed metrics
- **Right side:** Green background, success metrics
- **Bottom:** Large gold banner "99x MORE RELIABLE"
- **Style:** Clear comparison table format

---

## Slide 6: Kiro Spec-Driven Development (4:00-4:30)

### Content:
```
Built with Kiro

Spec-Driven Development Methodology

✓ Requirements First (50+ acceptance criteria)
✓ Design Documents (Architecture & data models)
✓ 50+ Implementation Tasks
✓ Automated Testing Hooks
✓ 111 Automated Tests
✓ Nightly Synthetic Probes

Specs Before Code. Quality Automated.
```

### Design Notes:
- **Background:** Dark blue/purple gradient
- **Text:** White with blue checkmarks
- **Style:** Clean bullet list
- **Bottom:** Kiro tagline in italics
- **Icon:** If you have Kiro logo, use it

---

## Slide 7: Impact & Metrics (4:30-4:50)

### Content:
```
Measurable Impact

99.5% → 99.7%  Connectivity (Target exceeded!)
180ms p95      Real-time Sync Latency
1.2s p95       Vote Tally Processing
100%           Synthetic Probe Success (30 days)

Teams can finally trust their planning tools.
```

### Design Notes:
- **Background:** White with green accents
- **Metrics:** Large numbers in green
- **Layout:** Grid of 4 metric boxes
- **Bottom:** Tagline in bold
- **Style:** Dashboard/metrics style

---

## Slide 8: Call to Action (4:50-5:00)

### Content:
```
Try Scrum Reborn Today

🌐 Live Demo
   main.d3tvb88c55agb4.amplifyapp.com

💻 Open Source on GitHub
   github.com/sgharlow/scrum-web-reborn

🔧 Built with Kiro
   Specs Before Code. Automated Quality.

Reliable Real-Time Collaboration
for Distributed Scrum Teams
```

### Design Notes:
- **Background:** Dark gradient (navy to black)
- **Text:** White with colored icons/emojis
- **URLs:** Large, easy to read
- **Style:** Professional end card
- **QR Code:** Optional - generate QR for live demo URL

---

## Quick Slide Design Tips

### Color Palette:
- **Success/Good:** #10B981 (green)
- **Failure/Bad:** #EF4444 (red)
- **AWS/Tech:** #FF9900 (orange)
- **Neutral:** #1F2937 (dark gray), #F3F4F6 (light gray)
- **Highlight:** #F59E0B (gold/amber)

### Fonts:
- **Headings:** Inter, Helvetica, or Arial Bold (48-72pt)
- **Body:** Inter, Helvetica, or Arial (24-36pt)
- **Metrics:** Monospace font (Consolas, Courier) for numbers

### Design Principles:
1. **High Contrast:** Light background + dark text OR dark background + light text
2. **Large Text:** Readable in small video preview
3. **Minimal Text:** Max 5-7 lines per slide
4. **Visual Hierarchy:** Big numbers, small explanations
5. **Consistent Style:** Use same color scheme throughout

---

## Tools & Templates

### Option 1: Google Slides (Free, Easy)
1. Go to slides.google.com
2. Create new presentation
3. Set slide size: File → Page Setup → Widescreen 16:9
4. Use template: "Simple Dark" or "Simple Light"
5. Copy content from above

### Option 2: PowerPoint (Professional)
1. Open PowerPoint
2. New Presentation → Blank
3. Design → Slide Size → Widescreen 16:9
4. Design → Themes → Pick minimal theme
5. Copy content from above

### Option 3: Canva (Easy + Beautiful)
1. Go to canva.com
2. Search "Presentation" → 1920x1080
3. Use template: "Tech Pitch Deck" or "Startup Pitch"
4. Replace content with above

### Option 4: Simple Text Slides (Fastest)
1. Black background
2. White text, centered
3. One key message per slide
4. Large font (72pt+)

---

## Slide Usage Timeline

| Time | Slide | What You're Saying |
|------|-------|-------------------|
| 0:00-0:10 | Title | "Distributed Scrum teams need reliable planning tools..." |
| 0:10-0:30 | Problem (P2P) | "But our original app had a critical problem: 50% failure..." |
| 0:30-1:00 | Solution (AppSync) | "Enter Scrum Reborn: We replaced P2P with AWS AppSync..." |
| 1:00-1:30 | Architecture | "Here's how it works: All communication goes through HTTPS..." |
| 1:30-3:30 | Live Demo | [Screen recording of your app - no slides] |
| 3:30-4:00 | Before/After | "Let's talk impact. From 50% to 99.5% connectivity..." |
| 4:00-4:30 | Kiro | [Screen recording of .kiro/ directory OR this slide] |
| 4:30-4:50 | Metrics | "99.5% connectivity, 180ms latency, 1.2s tally..." |
| 4:50-5:00 | Call to Action | "Try it yourself at [URL]... Built with Kiro." |

---

## Export Settings

### For Video Recording:
- **Format:** PNG or JPEG (not PDF)
- **Resolution:** 1920x1080 pixels
- **Quality:** High/Maximum
- **File names:** `01-title.png`, `02-problem.png`, etc.

### To Use in Video:
1. Export all slides as images
2. Import into OBS/Loom/video editor
3. Display full screen while recording
4. Transition between slides and screen recording

---

## Alternative: Text-Only Slides (If Short on Time)

If you're short on time, create simple text slides:

**Black background + White text, centered:**

```
Slide 1:
───────
Scrum Reborn
99x More Reliable

Slide 2:
───────
P2P Problem:
50% Failure Rate ❌

Slide 3:
───────
AppSync Solution:
99.5% Success Rate ✅
99x IMPROVEMENT! 🎉

Slide 4:
───────
Try it today:
main.d3tvb88c55agb4.amplifyapp.com
github.com/sgharlow/scrum-web-reborn
```

---

## Next Steps

1. **Choose your tool:** Google Slides (easiest), PowerPoint (professional), or Canva (beautiful)
2. **Create 8 slides** using content above (30 minutes)
3. **Export as images** (1920x1080 PNG)
4. **Save in:** `docs/hackathon/slides/`
5. **Practice transitioning** between slides and live demo

---

**Estimated Time:** 30-45 minutes to create all slides
**Difficulty:** Easy (copy/paste content, adjust colors)
**Result:** Professional-looking visuals for your video

**Good luck! Your slides will make your demo video 10x more compelling! 🎬**
