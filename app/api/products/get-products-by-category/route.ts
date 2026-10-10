import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { getProductsByCategory } from "@/app/actions/products";

export async function POST(req: Request) {
  try {
    const { id_category } = await req.json();
    if (!id_category) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }
    const products = await getProductsByCategory(id_category);
    return NextResponse.json(products);
  } catch (error) {
    return apiError(error);
  }
}
