import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { getProducts } from "@/app/actions/products";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error) {
    return apiError(error);
  }
}
