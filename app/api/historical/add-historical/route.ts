import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { addHistorical } from "../../../actions/historical";

export async function POST() {
  try {
    await addHistorical();
    return NextResponse.json({ mensage: "Sucess save data" });
  } catch (error) {
    return apiError(error);
  }
}
