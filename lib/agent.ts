import { fetchPendingPOCs, markPOCProcessing, updatePOCRow } from "./sheets";
import { researchCompany, researchBuyer } from "./research";
import { qualifyPOC, generateDemoBrief } from "./qualify";
import { POCRequest, AgentRunResult, CompanyInsights, BuyerInsights } from "./types";

export async function runAgent(accessToken: string): Promise<AgentRunResult> {
  const result: AgentRunResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  let pendingPOCs: POCRequest[];

  try {
    pendingPOCs = await fetchPendingPOCs(accessToken);
  } catch (err) {
    throw new Error(`Failed to fetch POCs from Google Sheets: ${err}`);
  }

  if (pendingPOCs.length === 0) {
    return result;
  }

  for (const poc of pendingPOCs) {
    try {
      console.log(`[Agent] Processing: ${poc.company} - ${poc.contactName}`);

      // Mark as in-progress immediately so concurrent runs skip it
      await markPOCProcessing(poc.rowIndex, accessToken);

      // Step 1: Research
      console.log(`[Agent] Researching company: ${poc.company}`);
      const companyInsights = await researchCompany(poc.company);

      console.log(`[Agent] Researching buyer: ${poc.contactName}`);
      const buyerInsights = await researchBuyer(
        poc.contactName,
        poc.contactRole,
        poc.company
      );

      // Step 2: Qualify
      console.log(`[Agent] Qualifying POC...`);
      const qualification = await qualifyPOC(
        poc.company,
        poc.contactName,
        poc.contactRole,
        poc.useCase,
        companyInsights,
        buyerInsights
      );

      // Step 3: Generate brief
      console.log(`[Agent] Generating demo brief...`);
      const demoBrief = await generateDemoBrief(
        poc.company,
        poc.contactName,
        poc.contactRole,
        poc.useCase,
        companyInsights,
        buyerInsights,
        qualification
      );

      // Step 4: Build research notes
      const researchNotes = buildResearchNotes(companyInsights, buyerInsights, qualification);

      // Step 5: Update the POC object
      const updatedPOC: POCRequest = {
        ...poc,
        status: "qualified",
        technicalComplexity: qualification.technicalComplexity,
        buyerLevel: qualification.buyerLevel,
        routing: qualification.routing,
        researchNotes,
        demoBrief,
        companyInsights,
        buyerInsights,
        processedAt: new Date().toISOString(),
      };

      // Step 6: Write back to Google Sheets
      await updatePOCRow(updatedPOC, accessToken);

      result.processed++;
      result.results.push(updatedPOC);

      console.log(
        `[Agent] ✓ Done: ${poc.company} → ${qualification.routing} (${qualification.technicalComplexity} / ${qualification.buyerLevel})`
      );
    } catch (err) {
      console.error(`[Agent] ✗ Error processing ${poc.company}:`, err);

      const errorPOC: POCRequest = {
        ...poc,
        status: "error",
        researchNotes: `Error: ${err instanceof Error ? err.message : String(err)}`,
        processedAt: new Date().toISOString(),
      };

      try {
        await updatePOCRow(errorPOC, accessToken);
      } catch (writeErr) {
        console.error(`[Agent] Failed to write error to sheet:`, writeErr);
      }

      result.errors++;
      result.results.push(errorPOC);
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
