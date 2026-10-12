import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import { removeCartItems, unmarkCartItem } from "@/app/actions/list";

export async function DELETE(request: Request) {
  try {
    await removeCartItems(await request.json());
    return NextResponse.json({ message: "Artículos eliminados del carrito" });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await unmarkCartItem(body?.id);
    return NextResponse.json({ message: "Artículo pendiente" });
  } catch (error) {
    return apiError(error);
  }
}
