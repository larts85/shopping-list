import { NextResponse } from "next/server";
import { getHistorical } from "@/app/actions/historical";
import { apiError } from "@/app/lib/apiError";
import { DataError } from "@/app/lib/database";
export async function GET(req: Request) {
  try {
    const page = Number(new URL(req.url).searchParams.get("page") ?? 0);
    if (!Number.isSafeInteger(page) || page < 0)
      throw new DataError("Página inválida");
    return NextResponse.json(await getHistorical(page));
  } catch (error) {
    return apiError(error);
  }
}
