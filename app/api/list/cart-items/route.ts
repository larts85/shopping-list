import { NextResponse } from "next/server";
import { apiError } from "@/app/lib/apiError";
import {
  getMoveTargets,
  moveCartItems,
  removeCartItems,
  unmarkCartItem,
} from "@/app/actions/list";

export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get("view") === "move-targets")
      return NextResponse.json(await getMoveTargets());
    return NextResponse.json({ error: "Vista inválida" }, { status: 400 });
  } catch (error) {
    return apiError(error, request);
  }
}

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

export async function POST(request: Request) {
  try {
    return NextResponse.json(await moveCartItems(await request.json()));
  } catch (error) {
    return apiError(error, request);
  }
}
