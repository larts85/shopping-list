import { apiError } from "@/app/lib/apiError";
import { updateListItemDetails } from "@/app/actions/list";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const input = await req.json();
    if (!input || typeof input !== "object")
      return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
    await updateListItemDetails(input.id, input);
    return NextResponse.json({ message: "Success save data" });
  } catch (error) {
    return apiError(error);
  }
}
