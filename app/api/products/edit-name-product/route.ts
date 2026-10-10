import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { editNameProduct, EditProductParams } from "@/app/actions/products";

export async function PUT(req: Request) {
  try {
    const product: EditProductParams = await req.json();
    if (!product) {
      return NextResponse.json({ error: "Required Product" }, { status: 400 });
    }
    await editNameProduct(product);
    return NextResponse.json({ message: "Success save data" }, { status: 200 });
  } catch (error) {
    return apiError(error);
  }
}
