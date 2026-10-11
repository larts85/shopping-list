import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { getCategories } from "@/app/actions/categories";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    return apiError(error);
  }
}
