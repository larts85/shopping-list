import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { getProductsByCategories } from "@/app/actions/products";

export async function GET() {
  try {
    const products = await getProductsByCategories();
    return NextResponse.json(products);
  } catch (error) {
    return apiError(error);
  }
}
