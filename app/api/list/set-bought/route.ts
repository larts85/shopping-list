import { apiError } from "@/app/lib/apiError";
import { NextResponse } from "next/server";
import { setBought } from "@/app/actions/list";

export async function PUT(req: Request) {
  try {
    const propsSetBougth = await req.json();
    if (!propsSetBougth) {
      return NextResponse.json({ error: "Required props" }, { status: 400 });
    }

    const { idList, cantidad, medida, precio, unit, precioMode } =
      propsSetBougth;
    await setBought(idList, cantidad, medida, precio ?? null, unit, precioMode);
    return NextResponse.json({ message: "Success save data" }, { status: 200 });
  } catch (error) {
    return apiError(error, req);
  }
}
