export type TechnicalComplexity = "HIGH" | "MEDIUM" | "LOW";
export type BuyerLevel = "Technical" | "Semi-Technical" | "Non-Technical";
export type ResourceRouting =
  | "Product Engineer Required"
  | "Sales Engineer OK"
  | "AE Can Handle";
export type PoCStatus = "pending" | "researching" | "qualified" | "error";
export type BusinessFit = "HIGH" | "MEDIUM" | "LOW";

export interface PoCRequest {
  rowIndex: number;
  company: string;
  contactName: string;
  contactRole: string;
  useCase: string;
  // Populated after research
  status: PoCStatus;
  technicalComplexity?: TechnicalComplexity;
  buyerLevel?: BuyerLevel;
  routing?: ResourceRouting;
  researchNotes?: string;
  demoBrief?: string;
  draftEmail?: string;
  businessFit?: BusinessFit;
  businessFitReasoning?: string;
  companyInsights?: CompanyInsights;
  buyerInsights?: BuyerInsights;
  processedAt?: string;
  error?: string;
}

export interface CompanyInsights {
  techStack: string;
  k8sSetup: string;
  teamSize: string;
  stage: string;
  recentNews: string;
  summary: string;
}

export interface BuyerInsights {
  roleLevel: string;
  technicalBackground: string;
  linkedinSummary: string;
  summary: string;
}

export interface QualificationResult {
  technicalComplexity: TechnicalComplexity;
  buyerLevel: BuyerLevel;
  routing: ResourceRouting;
  reasoning: string;
}

export interface BusinessFitResult {
  score: BusinessFit;
  fundingStage: string;
  companySize: string;
  growthSignals: string;
  budgetAuthority: string;
  reasoning: string;
}

export interface AgentRunResult {
  processed: number;
  skipped: number;
  errors: number;
  results: PoCRequest[];
}
