import Anthropic from "@anthropic-ai/sdk";
import {
  CompanyInsights,
  BuyerInsights,
  QualificationResult,
  BusinessFitResult,
  BusinessFit,
  TechnicalComplexity,
  BuyerLevel,
  ResourceRouting,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Applied to every system prompt so all generated content uses British English.
const BRITISH_ENGLISH = `Write exclusively in British English spelling and phrasing throughout all output.
Use British spellings: organisation (not organization), prioritise (not prioritize), recognise (not recognize), \
analyse (not analyze), colour (not color), behaviour (not behaviour), licence (not license, when used as a noun), \
programme (not program, when not referring to software), centre (not center), whilst (not while, where appropriate), \
amongst (not among, where appropriate), and similar British conventions.
Do not use em dashes anywhere. Use commas, colons, or rephrase the sentence instead.`;

export async function qualifyPOC(
  company: string,
  contactName: string,
  contactRole: string,
  useCase: string,
  companyInsights: CompanyInsights,
  buyerInsights: BuyerInsights
): Promise<QualificationResult> {
  const systemPrompt = `You are a senior solutions architect at a B2B SaaS company.
Your job is to qualify incoming PoC requests and route them to the right resources.

${BRITISH_ENGLISH}

Routing rules:
- HIGH complexity + Technical buyer → "Product Engineer Required"
- MEDIUM complexity OR Semi-Technical buyer → "Sales Engineer OK"
- LOW complexity AND Non-Technical buyer → "AE Can Handle"

Return ONLY valid JSON matching this exact schema:
{
  "technicalComplexity": "HIGH" | "MEDIUM" | "LOW",
  "buyerLevel": "Technical" | "Semi-Technical" | "Non-Technical",
  "routing": "Product Engineer Required" | "Sales Engineer OK" | "AE Can Handle",
  "reasoning": "2-3 sentence explanation in British English"
}`;

  const userPrompt = `Qualify this PoC request:

COMPANY: ${company}
CONTACT: ${contactName} (${contactRole})
USE CASE: ${useCase}

COMPANY RESEARCH:
- Tech Stack: ${companyInsights.techStack}
- K8s/Infra: ${companyInsights.k8sSetup}
- Team Size: ${companyInsights.teamSize}
- Stage: ${companyInsights.stage}
- Recent News: ${companyInsights.recentNews}

BUYER RESEARCH:
- Role Level: ${buyerInsights.roleLevel}
- Technical Background: ${buyerInsights.technicalBackground}
- LinkedIn: ${buyerInsights.linkedinSummary}

Assess technical complexity (HIGH=custom integration/K8s/enterprise scale, MEDIUM=standard setup with some custom needs, LOW=straightforward/out-of-box).
Assess buyer level (Technical=engineer/architect, Semi-Technical=product/manager, Non-Technical=exec/sales/business).
Apply routing rules and return JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON — strip any markdown fences if present
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned invalid JSON for qualification");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    technicalComplexity: parsed.technicalComplexity as TechnicalComplexity,
    buyerLevel: parsed.buyerLevel as BuyerLevel,
    routing: parsed.routing as ResourceRouting,
    reasoning: parsed.reasoning,
  };
}

export async function generateDemoBrief(
  company: string,
  contactName: string,
  contactRole: string,
  useCase: string,
  companyInsights: CompanyInsights,
  buyerInsights: BuyerInsights,
  qualification: QualificationResult
): Promise<string> {
  const systemPrompt = `You are a senior solutions engineer writing concise, actionable demo prep briefs.
Be specific, direct, and focus on what matters for the demo. No fluff.

${BRITISH_ENGLISH}`;

  const userPrompt = `Write a demo prep brief for this PoC:

COMPANY: ${company}
CONTACT: ${contactName} (${contactRole})
USE CASE: ${useCase}
ROUTING: ${qualification.routing}
TECHNICAL COMPLEXITY: ${qualification.technicalComplexity}
BUYER LEVEL: ${qualification.buyerLevel}

COMPANY CONTEXT:
${companyInsights.summary}
Tech Stack: ${companyInsights.techStack.slice(0, 200)}
Infrastructure: ${companyInsights.k8sSetup.slice(0, 200)}

BUYER CONTEXT:
${buyerInsights.summary}

Generate a brief with these sections:
## Quick Summary
(2 sentences: who they are, what they need)

## Key Discovery Questions
(3-5 bullet points)

## Demo Focus Areas
(3-4 bullet points specific to their use case and tech stack)

## Potential Objections
(2-3 likely concerns with suggested responses)

## Recommended Next Steps
(2-3 concrete actions)

Keep it under 400 words total. Use British English throughout.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function generateDraftEmail(
  company: string,
  contactName: string,
  contactRole: string,
  useCase: string,
  companyInsights: CompanyInsights,
  buyerInsights: BuyerInsights,
  qualification: QualificationResult
): Promise<string> {
  const complexityGuidance: Record<string, string> = {
    HIGH: "propose a technical deep-dive session with a solutions engineer who can speak to architecture and custom integrations",
    MEDIUM: "propose a tailored demo covering their core use case with room for Q&A on configuration options",
    LOW: "propose a focused 30-minute walkthrough showing how quickly they can get value out of the box",
  };

  const systemPrompt = `You are a senior account executive writing personalised outreach emails to prospects.
Be warm but professional. Keep it concise: under 200 words. No buzzwords or filler phrases.
Write the email as plain text with no markdown formatting, no bullet points, no headers.
Do not include a subject line. Start directly with the greeting.

${BRITISH_ENGLISH}`;

  const userPrompt = `Write a personalised outreach email for this prospect:

CONTACT: ${contactName}, ${contactRole} at ${company}
USE CASE: ${useCase}
TECHNICAL COMPLEXITY: ${qualification.technicalComplexity}
BUYER LEVEL: ${qualification.buyerLevel}

RECENT COMPANY NEWS (reference at least one item naturally):
${companyInsights.recentNews.slice(0, 300)}

COMPANY CONTEXT:
${companyInsights.summary}

BUYER BACKGROUND:
${buyerInsights.summary}
Role level: ${buyerInsights.roleLevel}

DEMO APPROACH: ${complexityGuidance[qualification.technicalComplexity]}

Requirements:
- Address ${contactName} by first name
- Reference something specific from their recent news or company context to show you have done your research
- Acknowledge their role and what matters to someone at their level
- Propose the demo naturally without being pushy
- Close with a soft call to action (suggesting a time to connect, not demanding one)
- British English throughout, no em dashes`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function analyseBusinessFit(
  company: string,
  contactName: string,
  contactRole: string,
  companyInsights: CompanyInsights,
  buyerInsights: BuyerInsights
): Promise<BusinessFitResult> {
  const systemPrompt = `You are a senior revenue operations analyst scoring inbound leads for business fit.

${BRITISH_ENGLISH}

Score prospects as HIGH, MEDIUM, or LOW using these criteria:
- HIGH: Series B or later funding, 100+ employees, buyer is VP level or above, recent positive growth signals (fundraise, hiring surge, product launch)
- MEDIUM: Series A funding, 50-100 employees, buyer is a senior IC or manager, some growth signals present
- LOW: Seed stage or bootstrapped, fewer than 50 employees, buyer is an IC without budget authority, no recent growth signals

Extract signals from the research provided. If a signal is unclear or missing, state that explicitly rather than assuming.

Return ONLY valid JSON matching this exact schema:
{
  "score": "HIGH" | "MEDIUM" | "LOW",
  "fundingStage": "string describing funding stage",
  "companySize": "string describing employee count",
  "growthSignals": "string describing recent growth signals or lack thereof",
  "budgetAuthority": "string describing buyer budget authority based on their role",
  "reasoning": "2-3 sentence explanation in British English"
}`;

  const userPrompt = `Score the business fit for this prospect:

COMPANY: ${company}
CONTACT: ${contactName} (${contactRole})

COMPANY RESEARCH:
Stage/Funding: ${companyInsights.stage}
Team Size: ${companyInsights.teamSize}
Recent News: ${companyInsights.recentNews}
Summary: ${companyInsights.summary}

BUYER RESEARCH:
Role Level: ${buyerInsights.roleLevel}
Background: ${buyerInsights.technicalBackground}
Summary: ${buyerInsights.summary}

Extract the funding stage, company size, growth signals, and budget authority. Apply the scoring criteria and return JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned invalid JSON for business fit analysis");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    score: parsed.score as BusinessFit,
    fundingStage: parsed.fundingStage,
    companySize: parsed.companySize,
    growthSignals: parsed.growthSignals,
    budgetAuthority: parsed.budgetAuthority,
    reasoning: parsed.reasoning,
  };
}
