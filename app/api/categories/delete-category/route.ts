import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { deleteCategoryById } from "@/app/actions/categories";

export async function DELETE(req: Request) {
  try {
    const idCategory = await req.json();
    if (!idCategory) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }
    await deleteCategoryById(idCategory);
    return NextResponse.json({ message: "Categoría eliminada" });
  } catch (error) {
    return apiError(error);
  }
}
