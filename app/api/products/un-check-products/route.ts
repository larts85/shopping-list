import { NextResponse } from "next/server";
import { unCheckProducts } from "../../../actions/products";

export async function PUT(req: Request) {
  try {
    await unCheckProducts();
    return NextResponse.json(
      { message: "Free selection product list" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error });
  }
}
