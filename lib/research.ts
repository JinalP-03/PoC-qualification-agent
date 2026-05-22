import { tavily } from "@tavily/core";
import { CompanyInsights, BuyerInsights } from "./types";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export async function researchCompany(
  company: string
): Promise<CompanyInsights> {
  const queries = [
    `${company} tech stack infrastructure engineering`,
    `${company} Kubernetes cloud architecture team size`,
    `${company} company stage funding valuation 2024 2025`,
    `${company} latest news announcements`,
  ];

  const results = await Promise.allSettled(
    queries.map((q) =>
      client.search(q, {
        maxResults: 3,
        searchDepth: "basic",
        includeAnswer: true,
      })
    )
  );

  const techStackResult = results[0].status === "fulfilled" ? results[0].value : null;
  const k8sResult = results[1].status === "fulfilled" ? results[1].value : null;
  const stageResult = results[2].status === "fulfilled" ? results[2].value : null;
  const newsResult = results[3].status === "fulfilled" ? results[3].value : null;

  const extract = (r: typeof techStackResult) => {
    if (!r) return "No data found";
    return (
      r.answer ||
      r.results
        .slice(0, 2)
        .map((x) => x.content)
        .join(" ")
        .slice(0, 400)
    );
  };

  const techStack = extract(techStackResult);
  const k8sSetup = extract(k8sResult);
  const stageInfo = extract(stageResult);
  const news = extract(newsResult);

  // Build a summary from all results
  const allContent = [techStack, k8sSetup, stageInfo, news].join("\n");
  const teamSizeMatch = allContent.match(/(\d+[\+]?\s*(employees|engineers|people|team members|headcount))/i);

  return {
    techStack: techStack.slice(0, 300),
    k8sSetup: k8sSetup.slice(0, 300),
    teamSize: teamSizeMatch ? teamSizeMatch[0] : "Unknown (not found in search)",
    stage: stageInfo.slice(0, 300),
    recentNews: news.slice(0, 300),
    summary: `Company: ${company}. Tech: ${techStack.slice(0, 150)}. Stage: ${stageInfo.slice(0, 100)}.`,
  };
}

export async function researchBuyer(
  contactName: string,
  contactRole: string,
  company: string
): Promise<BuyerInsights> {
  const queries = [
    `${contactName} ${company} ${contactRole} LinkedIn`,
    `${contactName} ${company} engineering technical background`,
  ];

  const results = await Promise.allSettled(
    queries.map((q) =>
      client.search(q, {
        maxResults: 3,
        searchDepth: "basic",
        includeAnswer: true,
      })
    )
  );

  const linkedinResult = results[0].status === "fulfilled" ? results[0].value : null;
  const bgResult = results[1].status === "fulfilled" ? results[1].value : null;

  const extractText = (r: typeof linkedinResult) => {
    if (!r) return "No data found";
    return (
      r.answer ||
      r.results
        .slice(0, 2)
        .map((x) => x.content)
        .join(" ")
        .slice(0, 400)
    );
  };

  const linkedinSummary = extractText(linkedinResult);
  const technicalBackground = extractText(bgResult);

  // Infer role level from title
  const roleLevel = inferRoleLevel(contactRole);

  return {
    roleLevel,
    technicalBackground: technicalBackground.slice(0, 300),
    linkedinSummary: linkedinSummary.slice(0, 300),
    summary: `${contactName} (${contactRole} at ${company}). Role level: ${roleLevel}. Background: ${technicalBackground.slice(0, 100)}.`,
  };
}

function inferRoleLevel(role: string): string {
  const lower = role.toLowerCase();

  if (
    lower.includes("cto") ||
    lower.includes("vp engineering") ||
    lower.includes("head of engineering") ||
    lower.includes("principal engineer") ||
    lower.includes("staff engineer") ||
    lower.includes("architect")
  ) {
    return "Senior Technical Leader";
  }

  if (
    lower.includes("engineer") ||
    lower.includes("developer") ||
    lower.includes("devops") ||
    lower.includes("sre") ||
    lower.includes("platform")
  ) {
    return "Hands-on Technical";
  }

  if (
    lower.includes("ceo") ||
    lower.includes("coo") ||
    lower.includes("cfo") ||
    lower.includes("president") ||
    lower.includes("founder")
  ) {
    return "Executive";
  }

  if (
    lower.includes("product") ||
    lower.includes("manager") ||
    lower.includes("director") ||
    lower.includes("lead")
  ) {
    return "Manager / Product";
  }

  if (
    lower.includes("sales") ||
    lower.includes("marketing") ||
    lower.includes("success") ||
    lower.includes("account")
  ) {
    return "Business / GTM";
  }

  return "Unknown";
}
