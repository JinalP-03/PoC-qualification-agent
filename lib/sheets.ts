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

/** Build an OAuth2 client from the user's access token stored in their session. */
function getOAuthClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function fetchPendingPOCs(accessToken: string): Promise<POCRequest[]> {
  const auth = getOAuthClient(accessToken);
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

    if (!company || !contactName) return;

    // Only process rows with no research notes yet and not already running
    if (status && status !== "pending") return;
    if (researchNotes) return;

    pending.push({
      rowIndex: idx + 2, // header is row 1, data starts at row 2
      company,
      contactName,
      contactRole,
      useCase,
      status: "pending",
    });
  });

  return pending;
}

export async function fetchAllPOCs(accessToken: string): Promise<POCRequest[]> {
  const auth = getOAuthClient(accessToken);
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

export async function updatePOCRow(poc: POCRequest, accessToken: string): Promise<void> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const range = `${SHEET_RANGE}!E${poc.rowIndex}:K${poc.rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          poc.status,
          poc.technicalComplexity || "",
          poc.buyerLevel || "",
          poc.routing || "",
          poc.researchNotes || "",
          poc.demoBrief || "",
          poc.processedAt || new Date().toISOString(),
        ],
      ],
    },
  });
}

export async function markPOCProcessing(rowIndex: number, accessToken: string): Promise<void> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!E${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [["researching"]] },
  });
}

export async function ensureSheetHeaders(accessToken: string): Promise<void> {
  const auth = getOAuthClient(accessToken);
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
