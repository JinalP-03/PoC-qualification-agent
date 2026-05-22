import { NextResponse } from "next/server";
import { fetchAllPOCs } from "@/lib/sheets";

export async function GET() {
  try {
    const pocs = await fetchAllPOCs();
    return NextResponse.json({ success: true, pocs });
  } catch (err) {
    console.error("[API /pocs] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
