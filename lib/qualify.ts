import Anthropic from "@anthropic-ai/sdk";
import {
  CompanyInsights,
  BuyerInsights,
  QualificationResult,
  TechnicalComplexity,
  BuyerLevel,
  ResourceRouting,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function qualifyPOC(
  company: string,
  contactName: string,
  contactRole: string,
  useCase: string,
  companyInsights: CompanyInsights,
  buyerInsights: BuyerInsights
): Promise<QualificationResult> {
  const systemPrompt = `You are a senior solutions architect at a B2B SaaS company.
Your job is to qualify incoming POC requests and route them to the right resources.

Routing rules:
- HIGH complexity + Technical buyer → "Product Engineer Required"
- MEDIUM complexity OR Semi-Technical buyer → "Sales Engineer OK"
- LOW complexity AND Non-Technical buyer → "AE Can Handle"

Return ONLY valid JSON matching this exact schema:
{
  "technicalComplexity": "HIGH" | "MEDIUM" | "LOW",
  "buyerLevel": "Technical" | "Semi-Technical" | "Non-Technical",
  "routing": "Product Engineer Required" | "Sales Engineer OK" | "AE Can Handle",
  "reasoning": "2-3 sentence explanation"
}`;

  const userPrompt = `Qualify this POC request:

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
Be specific, direct, and focus on what matters for the demo. No fluff.`;

  const userPrompt = `Write a demo prep brief for this POC:

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

Keep it under 400 words total.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
