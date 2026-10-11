import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import {
  getSuggestions,
  submitSuggestion,
  reviewSuggestion,
} from "@/app/actions/suggestions";
export async function GET() {
  try {
    return NextResponse.json(await getSuggestions());
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    await submitSuggestion(await request.json());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const b = await request.json();
    await reviewSuggestion(b.id, b.decision);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
