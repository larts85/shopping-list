import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { unCheckProducts } from "../../../actions/products";

export async function PUT() {
  try {
    await unCheckProducts();
    return NextResponse.json(
      { message: "Free selection product list" },
      { status: 200 }
    );
  } catch (error) {
    return apiError(error);
  }
}
