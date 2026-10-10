import { NextResponse } from "next/server";
import { updateMultipleProducts } from "@/app/actions/list";

export async function PUT(req: Request) {
  try {
    const changedProducts = await req.json();
    if (!Array.isArray(changedProducts)) {
      return NextResponse.json(
        { error: "Invalid products array" },
        { status: 400 }
      );
    }

    await updateMultipleProducts(changedProducts);
    return NextResponse.json({ message: "Success save data" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo actualizar la lista" }, { status: 500 });
  }
}
