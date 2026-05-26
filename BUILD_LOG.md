# Build Log — PoC Qualification Agent

> A record of what was built, why, what broke, what was learned.

---

## Origin: Two Conversations That Collapsed Into One Idea

### An interview

During an interview, a recurring theme surfaced: the cost of pulling senior engineering resource into unqualified demos. The problem wasn't that sales teams were doing anything wrong — they were doing their job. The problem was the absence of a systematic qualification layer between "prospect books a call" and "product engineer joins the call."

The company, like many developer tooling companies, has a product that requires technical credibility to sell. You can't fake your way through a Kubernetes platform engineering demo. But you also can't spend a senior engineer's afternoon on every inbound that fills out a form.

That conversation clarified something I'd observed but not fully articulated.

### The parallel experience

In another company, I'd seen the same dynamic from the inside. PoCs weren't just sales theatre — I viewed them as the real qualification event. By the time you're doing a PoC, you know whether the prospect can actually use the product and whether the deal has legs. But the cost of getting to that point varied wildly depending on who got pulled into the room.

I'd been thinking about PoCs as serving two distinct purposes that most teams conflate:

**1. Qualification mechanisms** — Is this prospect technically capable of adopting the product? Is the use case real? Is the buyer the right person?

**2. Conversion accelerators** — Given a qualified prospect, how do you compress the time to "yes"? What do they need to see? What objections will they raise?

Most teams optimise for the second purpose and ignore the first. They assume qualification happened somewhere upstream (sales call, discovery, whatever) and that everyone arriving at the PoC stage deserves the same level of resource. They don't.

### The Build

Friday, 23 May 2026. Encode AI's Build Day — sponsored by Nebius, Tavily, and Vercel. Eight hours to build something real.

I built the PoC Qualification Agent.

---

## Build Timeline

### Friday 23 May — Build Day (Encode AI)

**Morning:** Scoped the problem and committed to the approach. Decided to build around Google Sheets as the data layer because that's what GTM teams actually use — not always a database or CRM, but a spreadsheet. The agent needed to meet Sales teams where they are.

Chose OAuth over a service account. Initial thinking was service account (simpler setup), but OAuth means the agent acts on behalf of the user who owns the sheet — no manual sharing step, no permission management, tokens auto-refresh. Better for a real deployment.

**Afternoon:** Core pipeline working end-to-end — Tavily research, Claude qualification, sheet writes. The routing logic (`HIGH + Technical → Product Engineer Required`) came together cleanly. The parallel generation (demo brief + draft email + business fit in `Promise.all`) shaved meaningful time off each PoC run.

**Evening:** Dashboard built (+and after 2.5+ hours of debugging!). Dark UI with colour-coded routing cards. Filter tabs by status. Detail modal for full brief + email + business fit. Sign-in flow with NextAuth.

### Monday 26 May — Fixes + Deployment

Came back to several issues that needed resolving:

- Status column as single lock (removed Research Notes as secondary filter)
- Column mapping corrections
- POC → PoC capitalisation pass
- Business Fit analysis added as column N
- Draft email generation wired up to column M
- TypeScript clean build confirmed

---

## Technical Challenges

### 1. Trailing Whitespace in Status Column (~2.5 hours)

The most painful bug of the build. The pending check was:

```typescript
if (status && status !== "pending") return;
```

Rows were being skipped even though column F looked blank or said "pending." After extensive debugging (including writing raw cell values with their length to a debug column), the culprit was trailing whitespace — either from Google Sheets auto-formatting or from a previous write that included extra characters.

The fix: trim the status value when reading it. But the bigger lesson was that the debug infrastructure (writing raw values to spare columns) was essential. You cannot debug sheet state from application logs alone.

### 2. Column Mapping Mismatch

Initial column mapping had `STATUS` at index 4. The actual sheet had an extra column: **PoC Day** (column E) was inserted between PoC Start Date and Status, pushing Status to index 5 (column F) and everything after it one position right.

The agent was reading from and writing to the wrong columns for the entire early test phase. The fix required updating every COLUMNS constant and splitting the update write into two calls: one for F (Status) alone, then one for H:N (outputs), to avoid clobbering G (Use Case), which is an input column sitting in the middle of the range.

```typescript
// Write status separately — G is Use Case (input), must not be overwritten
await sheets.spreadsheets.values.update({ range: `Sheet1!F${rowIndex}` ... });

// Write outputs H through N
await sheets.spreadsheets.values.update({ range: `Sheet1!H${rowIndex}:N${rowIndex}` ... });
```

### 3. Google Sheets API Quota Limits

With debug writes on every agent run (O2, O3, O4, O5 for diagnostics plus the actual data writes), hitting quota limits during rapid testing was a real issue. Sheets API has a 300 requests per minute per project limit, and between the read, the debug writes, the status write, and the H:N write, each PoC was consuming 6+ API calls.

Mitigation: batch where possible, remove debug writes for production, and be surgical about what gets written when.

### 4. OAuth vs Service Account Decision

The initial build spec said service account. The implementation switched to OAuth early, and it was the right call — but it added complexity:

- NextAuth v5 (beta) has breaking changes from v4; explicit route handler wrappers required for Next.js 16's strict types
- Token refresh needed to be implemented manually in the JWT callback using Google's token endpoint
- The `access_type: "offline"` and `prompt: "consent"` params are required to always get a refresh token (without `prompt: "consent"`, returning users don't get a new refresh token)

The NextAuth route handler error (`export { handlers as GET }` failing with type mismatch) cost an hour. Fix was explicit async wrapper functions:

```typescript
export async function GET(request: NextRequest) {
  return handlers.GET(request);
}
```

### 5. POC → PoC Capitalisation

A broad sed pass across all TypeScript files to rename `POC` → `PoC` was run mid-build. Several issues:

- macOS case-insensitive filesystem: renaming `POCCard.tsx` → `PoCCard.tsx` didn't register as a real rename. Required a two-step via git mv through an intermediate filename.
- The sed pass renamed function names (e.g. `qualifyPOC` → `qualifyPoC`) but `agent.ts` had been rewritten separately and still used the old name. Caused an import mismatch that only surfaced at runtime.
- The setter `setSelectedPOC` was renamed but `setSelectedPOC` (the React state setter) wasn't updated consistently, causing a runtime error in the dashboard.

Lesson: broad automated renames need a TypeScript build check immediately after to catch any name mismatches that introduce import errors.

---

## Design Decisions

### Status Column as Single Source of Truth

Early implementation used two locks: Status (column F) and Research Notes (column K). A row was only picked up if Status was empty/pending AND Research Notes was empty.

The problem: these could drift. A previous run could write Research Notes but fail before writing Status, or a user could clear Status to trigger a reprocess without clearing Notes. Either way, the agent would silently skip rows it should process.

Fix: Status alone determines whether a row is picked up. If Status is blank or `"pending"`, the agent processes it. Research Notes having content is irrelevant — Status is the lock.

```typescript
// Before (two locks — fragile)
if (status && status !== "pending") return;
if (researchNotes) return;

// After (status only — single source of truth)
if (status && status !== "pending") return;
```

### Technical Alignment vs Business Alignment

The qualification logic focuses on **technical alignment** — complexity of what the prospect needs to do, and sophistication of who they're talking to:

- Technical Complexity: what will the integration actually require?
- Buyer Level: does the person in the room understand what they're buying?

This is distinct from **business alignment** — commercial qualification (CAC, LTV, payback period, deal size). That's a separate concern, and one that belongs earlier in the funnel (SDR/BDR stage), not at the PoC routing stage.

Business Fit analysis (column N) was added later as a signal, not a gate. It scores on funding stage, company size, buyer authority, and growth signals — useful context for the account exec, but the routing decision itself is based on technical complexity and buyer level. A bootstrapped startup with a VP of Engineering who knows Kubernetes gets the right resource regardless of their funding stage.

### British English Throughout

All Claude API prompts enforce British English spelling and phrasing via a shared constant applied to every system prompt. This is consistent with the company context (UK-based) and avoids mixed conventions across generated content.

Specific enforcements: organisation, prioritise, recognise, analyse, whilst, amongst. No em dashes in any generated text (replaced with commas, colons, or restructured sentences).

### Parallel Generation for Speed

Demo brief, draft email, and business fit analysis all depend on the same research and qualification data. They're generated in `Promise.all` after qualification completes:

```typescript
const [demoBrief, draftEmail, businessFitResult] = await Promise.all([
  generateDemoBrief(...),
  generateDraftEmail(...),
  analyseBusinessFit(...),
]);
```

This reduced total agent time per PoC by roughly 20–30 seconds compared to sequential calls.

---

## Agent Scope: What It Is and What It Isn't

The agent handles **resource allocation** — deciding who should be in the room for the PoC:

- Product Engineer (for complex technical deals with technical buyers)
- Sales Engineer (for standard integrations or semi-technical buyers)
- AE alone (for straightforward use cases with non-technical buyers)

It does **not** handle **commercial qualification** — that's a different problem:

- Is this deal the right size?
- Does the prospect have budget and a buying process?
- What's the payback period look like?
- Is the timing right?

Commercial qualification belongs earlier in the funnel and requires CRM data, deal history, and pricing context that the agent doesn't have. Conflating resource routing with commercial qualification would make the agent worse at both.

The Business Fit score (column N) is the bridge — it surfaces signals relevant to commercial qualification (funding stage, company size, growth trajectory, buyer authority) without making routing decisions on that basis.

---

## Key Insights

### On PoCs as a GTM Asset

PoCs are the highest-leverage moment in a technical sale. They're where the prospect's technical team and yours interact directly — and that interaction either builds conviction or surfaces problems. Treating them as a cost centre (something to be minimised) misses the point. They're a **conversion accelerator** for qualified deals and a **qualification gate** for unqualified ones.

The failure mode is treating every PoC the same. The fix isn't fewer PoCs — it's smarter routing.

### On Resource Allocation as a Growth Lever

Product engineers are typically the most expensive and most constrained resource in a Series A/B DevTools company. Every hour they spend in an unqualified demo is an hour not spent on the product. At scale, this is an invisible CAC driver — the cost shows up in engineering burn, not in your marketing attribution.

Routing discipline compounds over time. A team that consistently puts the right resource in the right deal runs faster cycles, generates better technical content from the deals that do require depth, and builds a pattern of wins that looks repeatable to investors.

### On Building for GTM Teams

GTM teams don't want to learn new tools. They live in Slack, email, and spreadsheets. Building the agent around Google Sheets wasn't a concession — it was the right design choice. The intelligence lives in the agent; the interface lives where the team already works.

### On the 2026 Growth Environment

The growth trends that emerged from early 2026 research reinforce why resource allocation matters now more than ever:

- **Retention over acquisition.** Every bad demo that converts is a future churn. Every good demo that converts is a foundation for expansion. PoC quality is a leading indicator of net revenue retention.
- **Unit economics scrutiny.** Investors and boards are looking hard at CAC payback. Burning senior engineering time on unqualified deals is a hidden CAC multiplier. Making it visible and addressable is a genuine operational improvement.
- **PLG vs sales-led.** The best PLG motions self-qualify. For the deals that do require a human-led PoC, the bar for that investment should be high — and the resource matched to the deal, not the other way around.

---

## Files Produced

```
lib/
├── agent.ts          # Orchestrator: fetch → research → qualify → generate → write
├── sheets.ts         # Google Sheets API (OAuth2, read/write, column mapping)
├── research.ts       # Tavily: company (4 queries) + buyer (2 queries) research
├── qualify.ts        # Claude: qualification, demo brief, draft email, business fit
└── types.ts          # TypeScript types: PoCRequest, CompanyInsights, BuyerInsights, BusinessFitResult

app/
├── page.tsx                        # Dashboard (auth-gated, polls /api/pocs every 30s)
├── api/agent/route.ts              # POST /api/agent — triggers agent run (maxDuration: 300)
├── api/pocs/route.ts               # GET /api/pocs — reads all rows from sheet
├── api/setup/route.ts              # POST /api/setup — initialises headers
└── api/auth/[...nextauth]/route.ts # NextAuth route handlers (explicit wrappers for Next.js 16)

components/
├── PoCCard.tsx      # Colour-coded card with routing badge and business fit score
├── AgentControls.tsx # Run + refresh buttons
├── StatsBar.tsx      # Aggregate stats by routing/status
├── DetailModal.tsx   # Full detail view: brief, email, business fit, research notes
└── AuthButton.tsx    # Google sign in / sign out

auth.ts              # NextAuth v5: Google OAuth, Sheets scope, JWT token refresh
```

---

*Built at Encode AI Build Day, 23 May 2026. Extended and deployed 26 May 2026.*
