import { NextResponse } from "next/server";
import { addHistorical } from "../../../actions/historical";

export async function POST(req: Request) {
  try {
    await addHistorical();
    return NextResponse.json({ mensage: "Sucess save data" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server Error" });
  }
}
