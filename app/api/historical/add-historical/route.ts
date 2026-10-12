import { apiError } from "@/app/lib/apiError";
import { NextResponse } from "next/server";
import { addHistorical } from "../../../actions/historical";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await addHistorical(body?.productIds));
  } catch (error) {
    return apiError(error);
  }
}
