import { NextResponse } from "next/server";
import {
  getCatalogRequests,
  submitCatalogRequest,
  reviewCatalogRequest,
} from "@/app/actions/catalogRequests";
import { apiError } from "@/app/lib/apiError";
export async function GET() {
  try {
    return NextResponse.json(await getCatalogRequests());
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    await submitCatalogRequest(await request.json());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const b = await request.json();
    await reviewCatalogRequest(b.id, b.decision);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
