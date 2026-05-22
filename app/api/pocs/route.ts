import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAllPOCs } from "@/lib/sheets";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, error: "Not authenticated", pocs: [] },
      { status: 401 }
    );
  }

  try {
    const pocs = await fetchAllPOCs(session.accessToken);
    return NextResponse.json({ success: true, pocs });
  } catch (err) {
    console.error("[API /pocs] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
