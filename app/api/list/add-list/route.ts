import { apiError } from '@/app/lib/apiError';
import { NextResponse } from "next/server";
import { addList } from "../../../actions/list";

export async function POST() {
  try {
    await addList();
    return NextResponse.json({ message: "Success save data" });
  } catch (error) {
    return apiError(error);
  }
}
