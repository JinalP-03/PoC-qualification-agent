import { google } from "googleapis";
import { PoCRequest } from "./types";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SHEET_RANGE = "Sheet1";

// Actual sheet structure (0-based column indices):
// A=Company | B=Contact Name | C=Contact Role | D=PoC Start Date | E=PoC Day
// F=Status  | G=Use Case     | H=Tech Complexity | I=Buyer Technical Level
// J=Recommended Resource | K=Research Notes | L=Demo Prep Brief | M=Draft Email
// N=Business Fit

const COLUMNS = {
  COMPANY: 0,               // A
  CONTACT_NAME: 1,          // B
  CONTACT_ROLE: 2,          // C
  POC_START_DATE: 3,        // D
  POC_DAY: 4,               // E
  STATUS: 5,                // F
  USE_CASE: 6,              // G
  TECHNICAL_COMPLEXITY: 7,  // H
  BUYER_LEVEL: 8,           // I
  ROUTING: 9,               // J
  RESEARCH_NOTES: 10,       // K
  DEMO_BRIEF: 11,           // L
  DRAFT_EMAIL: 12,          // M
  BUSINESS_FIT: 13,         // N
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

export async function fetchPendingPOCs(accessToken: string): Promise<PoCRequest[]> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!A2:N`,
  });

  const rows = response.data.values || [];
  const pending: PoCRequest[] = [];

  // Debug: write the raw status value of row 2 to O5
  if (rows.length > 0) {
    const rawStatus = rows[0][COLUMNS.STATUS]; // row 2 = idx 0
    const display = rawStatus === undefined
      ? `undefined (col ${COLUMNS.STATUS} missing)`
      : `"${rawStatus}" (length: ${String(rawStatus).length})`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_RANGE}!O5`,
      valueInputOption: "RAW",
      requestBody: { values: [[`Row 2 status: ${display}`]] },
    });
  }

  rows.forEach((row, idx) => {
    const company = row[COLUMNS.COMPANY] || "";
    const contactName = row[COLUMNS.CONTACT_NAME] || "";
    const contactRole = row[COLUMNS.CONTACT_ROLE] || "";
    const useCase = row[COLUMNS.USE_CASE] || "";
    const status = row[COLUMNS.STATUS] || "";
    const researchNotes = row[COLUMNS.RESEARCH_NOTES] || "";
    const rowNum = idx + 2;

    if (!company || !contactName) return;
    if (status && status !== "pending") return;
    if (researchNotes) return;

    pending.push({
      rowIndex: rowNum,
      company,
      contactName,
      contactRole,
      useCase,
      status: "pending",
    });
  });

  return pending;
}

export async function writeProcessingStatus(accessToken: string, rowIndex: number, company: string): Promise<void> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!O4`,
    valueInputOption: "RAW",
    requestBody: { values: [[`Processing row ${rowIndex}: ${company}`]] },
  });
}

export async function writeAgentPing(accessToken: string, pendingCount: number): Promise<void> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!O2:O3`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["AGENT TEST"],
        [`${pendingCount} pending rows found`],
      ],
    },
  });
}

export async function fetchAllPOCs(accessToken: string): Promise<PoCRequest[]> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!A2:N`,
  });

  const rows = response.data.values || [];
  const all: PoCRequest[] = [];

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
      status: (row[COLUMNS.STATUS] as PoCRequest["status"]) || "pending",
      technicalComplexity: row[COLUMNS.TECHNICAL_COMPLEXITY] as
        | PoCRequest["technicalComplexity"]
        | undefined,
      buyerLevel: row[COLUMNS.BUYER_LEVEL] as
        | PoCRequest["buyerLevel"]
        | undefined,
      routing: row[COLUMNS.ROUTING] as PoCRequest["routing"] | undefined,
      researchNotes: row[COLUMNS.RESEARCH_NOTES] || "",
      demoBrief: row[COLUMNS.DEMO_BRIEF] || "",
      draftEmail: row[COLUMNS.DRAFT_EMAIL] || "",
      // N=Business Fit is stored as "SCORE: reasoning" — parse the score prefix
      businessFit: (row[COLUMNS.BUSINESS_FIT] || "").split(":")[0].trim() as PoCRequest["businessFit"] || undefined,
      businessFitReasoning: row[COLUMNS.BUSINESS_FIT] || "",
    });
  });

  return all;
}

export async function updatePoCRow(poc: PoCRequest, accessToken: string): Promise<void> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  // F=Status (written separately so we don't overwrite G=Use Case)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!F${poc.rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [[poc.status]] },
  });

  // H:N = Technical Complexity, Buyer Technical Level, Recommended Resource,
  //        Research Notes, Demo Prep Brief, Draft Email, Business Fit
  const businessFitCell = poc.businessFit && poc.businessFitReasoning
    ? `${poc.businessFit}: ${poc.businessFitReasoning}`
    : poc.businessFit || "";

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!H${poc.rowIndex}:N${poc.rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          poc.technicalComplexity || "",  // H
          poc.buyerLevel || "",            // I
          poc.routing || "",               // J
          poc.researchNotes || "",         // K
          poc.demoBrief || "",             // L
          poc.draftEmail || "",            // M
          businessFitCell,                 // N
        ],
      ],
    },
  });
}

export async function markPoCProcessing(rowIndex: number, accessToken: string): Promise<void> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  // F=Status
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!F${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [["researching"]] },
  });
}

export async function ensureSheetHeaders(accessToken: string): Promise<void> {
  const auth = getOAuthClient(accessToken);
  const sheets = google.sheets({ version: "v4", auth });

  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_RANGE}!A1:N1`,
  });

  // Only write headers if row 1 col A is empty (don't overwrite existing headers)
  if (!check.data.values || !check.data.values[0]?.[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_RANGE}!A1:N1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          "Company",
          "Contact Name",
          "Contact Role",
          "PoC Start Date",
          "PoC Day",
          "Status",
          "Use Case",
          "Technical Complexity",
          "Buyer Technical Level",
          "Recommended Resource",
          "Research Notes",
          "Demo Prep Brief",
          "Draft Email",
          "Business Fit",
        ]],
      },
    });
  }
}
