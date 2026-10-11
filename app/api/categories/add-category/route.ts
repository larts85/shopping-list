import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { addCategory } from "@/app/actions/categories";

export async function POST(req: Request) {
  try {
    const nameCategory = await req.json();
    await addCategory(nameCategory);
    return NextResponse.json({ message: "Success save data" });
  } catch (error) {
    return apiError(error);
  }
}
