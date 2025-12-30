import { NextResponse } from "next/server";
import { addList } from "../../../actions/list";

export async function POST(req: Request) {
  try {
    await addList();
    return NextResponse.json({ message: "Success save data" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" });
  }
}
