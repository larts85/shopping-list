import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { deleteProductById } from "@/app/actions/products";

export async function DELETE(req: Request) {
  try {
    const idProduct = await req.json();

    if (!idProduct) {
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 404 }
      );
    }
    await deleteProductById(idProduct);
    return NextResponse.json({ status: 200 });
  } catch (error) {
    return apiError(error);
  }
}
