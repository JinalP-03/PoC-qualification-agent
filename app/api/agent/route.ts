import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const maxDuration = 300; // 5 minutes for long-running agent

export async function POST() {
  try {
    const result = await runAgent();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[API /agent] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "POC Agent API is running" });
}
