import { NextResponse } from "next/server";
import { setBought } from "@/app/actions/list";

export async function PUT(req: Request) {
  try {
    const propsSetBougth = await req.json();
    if (!propsSetBougth) {
      return NextResponse.json({ error: "Required props" }, { status: 400 });
    }

    const { idList, cantidad, medida, precio } = propsSetBougth;
    if (typeof idList !== "string" || !idList ||
        !Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0 ||
        !Number.isFinite(Number(medida)) || Number(medida) <= 0 ||
        precio === "" || precio == null ||
        !Number.isFinite(Number(precio)) || Number(precio) < 0) {
      return NextResponse.json({ error: "Valores de compra inválidos" }, { status: 400 });
    }
    await setBought(idList, cantidad, medida, precio);
    return NextResponse.json({ message: "Success save data" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo guardar la compra" }, { status: 500 });
  }
}
