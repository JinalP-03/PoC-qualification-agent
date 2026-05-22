import { handlers } from "@/auth";
import { NextRequest } from "next/server";

// Explicit wrappers required for Next.js 16 strict route handler types.
// NextAuth's handlers cover: /api/auth/signin, /callback/google, /session, /csrf, /providers
export async function GET(request: NextRequest) {
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  return handlers.POST(request);
}
