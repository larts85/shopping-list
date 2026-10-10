import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { getListProductsByCategories } from "@/app/actions/list";

export async function GET() {
  try {
    const filteredProductListByCategories = await getListProductsByCategories();
    return NextResponse.json(filteredProductListByCategories);
  } catch (error) {
    return apiError(error);
  }
}
