import { NextResponse } from "next/server";
import { deleteCategoryById } from "@/app/actions/categories";

export async function DELETE(req: Request) {
  try {
    const idCategory = await req.json();
    if (!idCategory) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 },
      );
    }
    await deleteCategoryById(idCategory);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
