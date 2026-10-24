import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import { bulkUpdateCartItems } from "@/app/actions/list";

export async function POST(request: Request) {
  try {
    await bulkUpdateCartItems(await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, request);
  }
}
