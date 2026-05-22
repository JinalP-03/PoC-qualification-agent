import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runAgent } from "@/lib/agent";

export const maxDuration = 300; // 5 minutes for long-running agent

export async function POST() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, error: "Not authenticated — sign in with Google first" },
      { status: 401 }
    );
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { success: false, error: "Session expired — please sign in again" },
      { status: 401 }
    );
  }

  try {
    const result = await runAgent(session.accessToken);
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
  const session = await auth();
  return NextResponse.json({
    status: "POC Agent API is running",
    authenticated: !!session?.accessToken,
  });
}
