import { NextResponse } from "next/server";
import { ensureSheetHeaders } from "@/lib/sheets";

export async function POST() {
  try {
    await ensureSheetHeaders();
    return NextResponse.json({
      success: true,
      message: "Sheet headers verified/created",
      sheetId: process.env.GOOGLE_SHEET_ID,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
