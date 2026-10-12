import { apiError } from "@/app/lib/apiError";
import {
  bulkEditProducts,
  type BulkEditProductsInput,
} from "@/app/actions/products";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const input = (await request.json()) as BulkEditProductsInput;
    await bulkEditProducts(input);
    return NextResponse.json({ message: "Productos actualizados" });
  } catch (error) {
    return apiError(error);
  }
}
