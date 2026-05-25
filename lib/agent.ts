import { fetchPendingPOCs, markPoCProcessing, updatePoCRow, writeProcessingStatus } from "./sheets";
import { researchCompany, researchBuyer } from "./research";
import { qualifyPOC, generateDemoBrief, generateDraftEmail, analyseBusinessFit } from "./qualify";
import { PoCRequest, AgentRunResult, CompanyInsights, BuyerInsights } from "./types";

export async function runAgent(accessToken: string): Promise<AgentRunResult> {
  const result: AgentRunResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  let pendingPoCs: PoCRequest[];

  try {
    pendingPoCs = await fetchPendingPOCs(accessToken);
  } catch (err) {
    throw new Error(`Failed to fetch PoCs from Google Sheets: ${err}`);
  }

  if (pendingPoCs.length === 0) {
    return result;
  }

  for (const poc of pendingPoCs) {
    try {
      // Mark as in-progress immediately so concurrent runs skip it
      await markPoCProcessing(poc.rowIndex, accessToken);
      await writeProcessingStatus(accessToken, poc.rowIndex, poc.company);

      // Step 1: Research (sequential — buyer research may use company context)
      const companyInsights = await researchCompany(poc.company);
      const buyerInsights = await researchBuyer(poc.contactName, poc.contactRole, poc.company);

      // Step 2: Qualify
      const qualification = await qualifyPOC(
        poc.company, poc.contactName, poc.contactRole, poc.useCase,
        companyInsights, buyerInsights
      );

      // Step 3: Generate brief, draft email, and business fit in parallel
      const [demoBrief, draftEmail, businessFitResult] = await Promise.all([
        generateDemoBrief(
          poc.company, poc.contactName, poc.contactRole, poc.useCase,
          companyInsights, buyerInsights, qualification
        ),
        generateDraftEmail(
          poc.company, poc.contactName, poc.contactRole, poc.useCase,
          companyInsights, buyerInsights, qualification
        ),
        analyseBusinessFit(
          poc.company, poc.contactName, poc.contactRole,
          companyInsights, buyerInsights
        ),
      ]);

      // Step 4: Build research notes
      const researchNotes = buildResearchNotes(companyInsights, buyerInsights, qualification);

      // Step 5: Assemble and write back to sheet
      const updatedPoC: PoCRequest = {
        ...poc,
        status: "qualified",
        technicalComplexity: qualification.technicalComplexity,
        buyerLevel: qualification.buyerLevel,
        routing: qualification.routing,
        researchNotes,
        demoBrief,
        draftEmail,
        businessFit: businessFitResult.score,
        businessFitReasoning: businessFitResult.reasoning,
        companyInsights,
        buyerInsights,
        processedAt: new Date().toISOString(),
      };

      await updatePoCRow(updatedPoC, accessToken);

      result.processed++;
      result.results.push(updatedPoC);
    } catch (err) {
      console.error(`[Agent] Error processing ${poc.company}:`, err);

      const errorPoC: PoCRequest = {
        ...poc,
        status: "error",
        researchNotes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        processedAt: new Date().toISOString(),
      };

      try {
        await updatePoCRow(errorPoC, accessToken);
      } catch (writeErr) {
        console.error(`[Agent] Failed to write error to sheet:`, writeErr);
      }

      result.errors++;
      result.results.push(errorPoC);
    }
  }

  return result;
}

function buildResearchNotes(
  company: CompanyInsights,
  buyer: BuyerInsights,
  qualification: { technicalComplexity: string; buyerLevel: string; routing: string; reasoning: string }
): string {
  return [
    `=== COMPANY RESEARCH ===`,
    `Tech Stack: ${company.techStack}`,
    `K8s/Infra: ${company.k8sSetup}`,
    `Team Size: ${company.teamSize}`,
    `Stage: ${company.stage}`,
    `News: ${company.recentNews}`,
    ``,
    `=== BUYER RESEARCH ===`,
    `Role Level: ${buyer.roleLevel}`,
    `Background: ${buyer.technicalBackground}`,
    `LinkedIn: ${buyer.linkedinSummary}`,
    ``,
    `=== QUALIFICATION ===`,
    `Technical Complexity: ${qualification.technicalComplexity}`,
    `Buyer Level: ${qualification.buyerLevel}`,
    `Routing: ${qualification.routing}`,
    `Reasoning: ${qualification.reasoning}`,
  ].join("\n");
}
