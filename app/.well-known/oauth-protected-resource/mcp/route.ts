import { NextResponse } from "next/server";
import { getMcpOAuthMetadata } from "@/app/lib/mcpAuth";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(getMcpOAuthMetadata(), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json(
      { error: "MCP OAuth no está configurado" },
      { status: 503 },
    );
  }
}
