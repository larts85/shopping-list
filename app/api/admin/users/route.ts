import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import { getAppUsers, updateAppUserRole } from "@/app/actions/profile";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getAppUsers());
  } catch (error) {
    return apiError(error, request);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await updateAppUserRole(body.email, body.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, request);
  }
}
