import { apiError } from "@/app/lib/apiError";
import { NextResponse } from "next/server";
import { bulkAddToList, type BulkAddItem } from "@/app/actions/list";

export async function POST(req: Request) {
  try {
    const items: BulkAddItem[] = await req.json();
    const result = await bulkAddToList(items);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
