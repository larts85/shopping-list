import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { addProduct } from "@/app/actions/products";

export async function POST(req: Request) {
  try {
    const product = await req.json();
    await addProduct(product);
    return NextResponse.json({ message: "Success save data" });
  } catch (error) {
    return apiError(error);
  }
}
