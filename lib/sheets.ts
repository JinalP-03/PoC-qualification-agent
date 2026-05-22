import { google } from "googleapis";
import { POCRequest } from "./types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SHEET_RANGE = "Sheet1";

// Column indices (0-based) mapping to the Google Sheet columns:
// A: Company | B: Contact Name | C: Contact Role | D: Use Case
// E: Status | F: Technical Complexity | G: Buyer Level | H: Routing
// I: Research Notes | J: Demo Brief | K: Processed At

const COLUMNS = {
  COMPANY: 0,
  CONTACT_NAME: 1,
  CONTACT_ROLE: 2,
  USE_CASE: 3,
  STATUS: 4,
  TECHNICAL_COMPLEXITY: 5,
  BUYER_LEVEL: 6,
  ROUTING: 7,
  RESEARCH_NOTES: 8,
  DEMO_BRIEF: 9,
  PROCESSED_AT: 10,
};

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars"
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function fetchPendingPOCs(): Promise<POCRequest[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!A2:K`,
  });

  const rows = response.data.values || [];
  const pending: POCRequest[] = [];

  rows.forEach((row, idx) => {
    const company = row[COLUMNS.COMPANY] || "";
    const contactName = row[COLUMNS.CONTACT_NAME] || "";
    const contactRole = row[COLUMNS.CONTACT_ROLE] || "";
    const useCase = row[COLUMNS.USE_CASE] || "";
    const status = row[COLUMNS.STATUS] || "";
    const researchNotes = row[COLUMNS.RESEARCH_NOTES] || "";

    // Skip header row artifacts or empty rows
    if (!company || !contactName) return;

    // Only process rows with no research notes yet (blank Status column)
    if (status && status !== "pending") return;
    if (researchNotes) return; // already processed

    pending.push({
      rowIndex: idx + 2, // Sheet rows start at 1, header at 1, data at 2
      company,
      contactName,
      contactRole,
      useCase,
      status: "pending",
    });
  });

  return pending;
}

export async function fetchAllPOCs(): Promise<POCRequest[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!A2:K`,
  });

  const rows = response.data.values || [];
  const all: POCRequest[] = [];

  rows.forEach((row, idx) => {
    const company = row[COLUMNS.COMPANY] || "";
    const contactName = row[COLUMNS.CONTACT_NAME] || "";
    if (!company || !contactName) return;

    all.push({
      rowIndex: idx + 2,
      company,
      contactName,
      contactRole: row[COLUMNS.CONTACT_ROLE] || "",
      useCase: row[COLUMNS.USE_CASE] || "",
      status: (row[COLUMNS.STATUS] as POCRequest["status"]) || "pending",
      technicalComplexity: row[COLUMNS.TECHNICAL_COMPLEXITY] as
        | POCRequest["technicalComplexity"]
        | undefined,
      buyerLevel: row[COLUMNS.BUYER_LEVEL] as
        | POCRequest["buyerLevel"]
        | undefined,
      routing: row[COLUMNS.ROUTING] as POCRequest["routing"] | undefined,
      researchNotes: row[COLUMNS.RESEARCH_NOTES] || "",
      demoBrief: row[COLUMNS.DEMO_BRIEF] || "",
      processedAt: row[COLUMNS.PROCESSED_AT] || "",
    });
  });

  return all;
}

export async function updatePOCRow(poc: POCRequest): Promise<void> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const range = `${SHEET_RANGE}!E${poc.rowIndex}:K${poc.rowIndex}`;

  const values = [
    [
      poc.status,
      poc.technicalComplexity || "",
      poc.buyerLevel || "",
      poc.routing || "",
      poc.researchNotes || "",
      poc.demoBrief || "",
      poc.processedAt || new Date().toISOString(),
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function markPOCProcessing(rowIndex: number): Promise<void> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!E${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [["researching"]] },
  });
}

export async function ensureSheetHeaders(): Promise<void> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const headers = [
    [
      "Company",
      "Contact Name",
      "Contact Role",
      "Use Case",
      "Status",
      "Technical Complexity",
      "Buyer Level",
      "Routing",
      "Research Notes",
      "Demo Brief",
      "Processed At",
    ],
  ];

  // Check if row 1 already has headers
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!A1:K1`,
  });

  if (!check.data.values || check.data.values[0]?.[0] !== "Company") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_RANGE}!A1:K1`,
      valueInputOption: "RAW",
      requestBody: { values: headers },
    });
  }
}
