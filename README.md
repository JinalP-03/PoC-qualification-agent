# ⚡ PoC Qualification & Resource Routing Agent

Automatically qualifies incoming PoC requests, researches prospects via Tavily, generates demo briefs via Claude, and routes to the right resource — all synced to Google Sheets.

## Problem

Product engineers get pulled into every demo without proper qualification. Wrong resources get assigned, wasting expensive engineering time.

## Solution

An agent that watches a Google Sheet for new PoC requests, auto-researches companies and buyers, qualifies technical complexity + buyer level, generates a demo prep brief, and updates the sheet — all automatically.

## Workflow

```
Sales adds row → Agent detects → Tavily researches → Claude qualifies → Sheet updated → Dashboard shows results
```

1. **Sales adds PoC** to Google Sheet (Company, Contact, Role, Use Case)
2. **Agent detects** new row (empty Research Notes column)
3. **Tavily researches**: tech stack, K8s setup, team size, stage, news, buyer background
4. **Claude qualifies**:
   - Technical Complexity: `HIGH` / `MEDIUM` / `LOW`
   - Buyer Level: `Technical` / `Semi-Technical` / `Non-Technical`
5. **Routes**:
   - `HIGH + Technical` → **Product Engineer Required** 🔴
   - `MEDIUM / Semi-Technical` → **Sales Engineer OK** 🟡
   - `LOW + Non-Technical` → **AE Can Handle** 🟢
6. **Claude generates** demo prep brief
7. **Sheet updated** with all findings
8. **Dashboard** shows results color-coded

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Google Sheets API** — watches for new PoCs, writes results back
- **Tavily Search API** — company + buyer research
- **Anthropic Claude API** — qualification + brief generation
- **Tailwind CSS** — dark dashboard UI
- **Vercel** — deployment (with 5-min function timeout for agent)

## Google Sheet Structure

| A: Company | B: Contact Name | C: Contact Role | D: Use Case | E: Status | F: Complexity | G: Buyer Level | H: Routing | I: Research Notes | J: Demo Brief | K: Processed At |

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/poc-agent
cd poc-agent
npm install
```

### 2. Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**
4. Create a **Service Account** → download JSON key
5. Share your Google Sheet with the service account email (Editor access)

### 3. Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in:

```env
# Google Sheets
GOOGLE_SHEET_ID=1ggEh0gXZ_mN70DZfCjfI2FY7qX_uZ3HoZbXqrBiWaKk
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Tavily
TAVILY_API_KEY=tvly-dev-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Initialize Sheet Headers

```bash
curl -X POST http://localhost:3000/api/setup
```

### 6. Run the Agent

Click **Run Agent** in the dashboard, or:

```bash
curl -X POST http://localhost:3000/api/agent
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all env vars in the Vercel dashboard under **Settings → Environment Variables**.

The `vercel.json` sets a 5-minute timeout for the agent function.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/pocs` | Fetch all PoCs from sheet |
| `POST` | `/api/agent` | Trigger agent run |
| `POST` | `/api/setup` | Initialize sheet headers |

## Architecture

```
app/
├── page.tsx              # Dashboard
├── api/
│   ├── agent/route.ts    # Agent trigger
│   ├── pocs/route.ts     # Fetch all PoCs
│   └── setup/route.ts    # Sheet init
components/
├── PoCCard.tsx           # Color-coded PoC card
├── AgentControls.tsx     # Run/refresh buttons
├── StatsBar.tsx          # Summary stats
└── DetailModal.tsx       # Full PoC detail view
lib/
├── types.ts              # TypeScript types
├── sheets.ts             # Google Sheets integration
├── research.ts           # Tavily research
├── qualify.ts            # Claude qualification + brief
└── agent.ts              # Main agent orchestrator
```
