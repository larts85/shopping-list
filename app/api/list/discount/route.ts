import { setListDiscount } from "@/app/actions/list";
import { apiError } from "@/app/lib/apiError";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const input = await request.json();
    if (!input || typeof input !== "object")
      return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
    const discount = await setListDiscount(input);
    return NextResponse.json(discount);
  } catch (error) {
    return apiError(error);
  }
}
