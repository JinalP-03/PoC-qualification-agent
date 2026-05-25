# ⚡ PoC Qualification & Resource Routing Agent

> Automatically qualifies incoming PoC requests, researches prospects, generates demo briefs, and routes to the right resource, synced to Google Sheets.

Built for GTM and sales teams at **Platform Engineering**, **DevTools**, and **Developer Infrastructure** companies, where the wrong resource in a demo wastes weeks and poisons pipeline.

---

## The Problem

At developer-tooling companies, not all PoCs are equal — but they all get treated like they are.

A startup founder kicking the tyres gets the same product engineer as a Series C platform team with a real Kubernetes migration problem. Senior engineering time gets burned on deals that an AE could close in a 30-minute walkthrough. Meanwhile, the deals that genuinely need deep technical engagement don't get enough of it.

**The result:** misallocated resources, slow cycles, and deals lost at both ends; the ones you over-engineered and the ones you under-served.

---

## What It Does

The agent watches a Google Sheet (or any other CRM if modified) for new PoC requests. When it finds one, it:

1. **Researches the company** — tech stack, infrastructure setup, funding stage, team size, recent news (via Tavily)
2. **Researches the buyer** — role level, technical background, seniority signals
3. **Qualifies technical complexity** — `HIGH` / `MEDIUM` / `LOW` based on what the engagement will actually require
4. **Qualifies buyer level** — `Technical` / `Semi-Technical` / `Non-Technical`
5. **Routes to the right resource:**
   - `HIGH + Technical` → **Product Engineer Required** 🔴
   - `MEDIUM / Semi-Technical` → **Sales Engineer OK** 🟡
   - `LOW + Non-Technical` → **AE Can Handle** 🟢
6. **Generates a demo prep brief** — discovery questions, focus areas, likely objections, next steps
7. **Drafts a personalised outreach email** — references recent news, acknowledges role, proposes demo
8. **Scores business fit** — `HIGH` / `MEDIUM` / `LOW` based on funding stage, company size, buyer authority, growth signals
9. **Writes everything back to the sheet** — dashboard updates automatically

---

## How It Works

```
Sales adds row → Agent detects → Tavily researches → Claude qualifies → Sheet updated → Dashboard shows results
```

### Google Sheet Structure

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Company | Contact Name | Contact Role | PoC Start Date | PoC Day | Status | Use Case | Technical Complexity | Buyer Technical Level | Recommended Resource | Research Notes | Demo Prep Brief | Draft Email | Business Fit |

**Status** (column F) is the single source of truth. The agent picks up rows where Status is blank or `"pending"`. Once processing starts it marks them `"researching"`, then `"qualified"` when done.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Auth | NextAuth v5 — Google OAuth 2.0 with Sheets scope |
| Sheet integration | Google Sheets API v4 via `googleapis` |
| Research | Tavily Search API — company + buyer intelligence |
| Qualification & generation | Anthropic Claude API (`claude-sonnet-4-6`) |
| UI | Tailwind CSS — dark dashboard with colour-coded cards |
| Deployment | Vercel (5-minute function timeout for agent runs) |

---

## 2026 GTM Context: Why Resource Allocation Matters More Than Ever

The growth playbook has shifted. Five findings that inform how this agent is designed:

- **Retention is the real growth metric.** Acquisition without retention is a leaky bucket. PoC quality directly determines whether a new customer becomes a retained one — a bad demo experience kills the relationship before it starts.

- **Unit economics clarity determines scalability.** CAC, LTV, and payback period aren't just investor metrics — they're operational ones. Burning a product engineer on an unqualified deal distorts your true cost of acquisition.

- **Product-led growth beats paid acquisition at scale.** The best PLG companies let the product do qualification. For deals that do require a human touch, that human needs to be the right one at the right moment.

- **Founder-led distribution + one channel mastery beats spreading thin.** Early GTM focus means every PoC should be deliberate. The agent enforces that discipline by surfacing which deals deserve deep investment.

- **Growth is a product feature, not a separate function.** The best growth teams are embedded in the product loop. This agent is a step toward making sales qualification as systematic and data-driven as product analytics.

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/poc-agent
cd poc-agent
npm install
```

### 2. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → enable **Google Sheets API** and **Google+ API** (for OAuth)
3. Create **OAuth 2.0 credentials** (Web application)
4. Add authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Note your **Client ID** and **Client Secret**

### 3. Environment Variables

```bash
cp .env.local.example .env.local
```

```env
# Google OAuth (from Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Google Sheet ID (from the URL: /spreadsheets/d/SHEET_ID/edit)
GOOGLE_SHEET_ID=your-sheet-id

# NextAuth secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-auth-secret

# Tavily Search API — https://tavily.com
TAVILY_API_KEY=tvly-...

# Anthropic Claude API — https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Dashboard polling interval (milliseconds)
NEXT_PUBLIC_POLL_INTERVAL_MS=30000
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the Google account that owns your Sheet.

### 5. Initialise Sheet Headers (optional)

```bash
curl -X POST http://localhost:3000/api/setup
```

Only needed if starting with a blank sheet. Won't overwrite existing headers.

### 6. Add PoC Rows to Your Sheet

Add rows with at minimum: Company (A), Contact Name (B), Contact Role (C), Use Case (G). Leave Status (F) blank. Then click **Run Agent** in the dashboard.

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/pocs` | Fetch all PoCs from sheet (requires auth) |
| `POST` | `/api/agent` | Trigger agent run (requires auth) |
| `POST` | `/api/setup` | Initialise sheet headers |

---

## Architecture

```
app/
├── page.tsx                  # Dashboard (auth-gated)
├── api/
│   ├── agent/route.ts        # Agent trigger — 5-min timeout
│   ├── pocs/route.ts         # Fetch all PoCs
│   └── setup/route.ts        # Sheet initialisation
components/
├── PoCCard.tsx               # Colour-coded PoC card
├── AgentControls.tsx         # Run / refresh buttons
├── StatsBar.tsx              # Summary stats
├── DetailModal.tsx           # Full PoC detail view
└── AuthButton.tsx            # Sign in / sign out
lib/
├── types.ts                  # TypeScript types
├── sheets.ts                 # Google Sheets read/write
├── research.ts               # Tavily company + buyer research
├── qualify.ts                # Claude qualification, brief, email, business fit
└── agent.ts                  # Main agent orchestrator
auth.ts                       # NextAuth v5 config + token refresh
```

### Agent Flow (per PoC)

```
markPoCProcessing()           → sets Status = "researching"
  ↓
researchCompany()             → 4 Tavily queries (tech stack, infra, stage, news)
researchBuyer()               → 2 Tavily queries (LinkedIn, background)
  ↓
qualifyPOC()                  → Claude: complexity + buyer level + routing
  ↓
Promise.all([
  generateDemoBrief(),        → Claude: 5-section prep brief
  generateDraftEmail(),       → Claude: personalised outreach email
  analyseBusinessFit(),       → Claude: funding/size/growth/authority score
])
  ↓
updatePoCRow()                → writes Status = "qualified", columns H:N
```

All Claude prompts enforce British English spelling and phrasing throughout.

---

## Deployment

```bash
npm install -g vercel
vercel
```

Add all environment variables in **Vercel → Settings → Environment Variables**. The `vercel.json` sets a 300-second function timeout for the agent route.

For production, add `https://your-app.vercel.app/api/auth/callback/google` as an authorised redirect URI in Google Cloud Console.

---

## Licence

MIT
