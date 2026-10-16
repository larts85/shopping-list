import { apiError } from "@/app/lib/apiError";
import { getListPageData } from "@/app/actions/list";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(await getListPageData());
  } catch (error) {
    return apiError(error);
  }
}
