import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import { updateHistoricalItem } from "@/app/actions/historical";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(
      await updateHistoricalItem(
        body.id,
        body,
        request.headers.get("X-List-ID") ?? undefined,
      ),
    );
  } catch (error) {
    return apiError(error, request);
  }
}
