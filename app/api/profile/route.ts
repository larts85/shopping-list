import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/profile";
import { apiError } from "@/app/lib/apiError";
export async function GET() {
  try {
    return NextResponse.json(await getCurrentUser());
  } catch (e) {
    return apiError(e);
  }
}
