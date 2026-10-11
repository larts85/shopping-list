import { NextResponse } from "next/server";
import { DataError } from "./database";
export function apiError(error: unknown) {
  if (error instanceof DataError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  const code = (error as { code?: string })?.code;
  if (code === "23503")
    return NextResponse.json(
      {
        error:
          "La categoría tiene productos asociados o la referencia no existe",
      },
      { status: 409 },
    );
  if (code === "23505")
    return NextResponse.json(
      { error: "El registro ya existe" },
      { status: 409 },
    );
  if (code === "23514" || code === "22P02" || error instanceof SyntaxError)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  console.error("Database operation failed", error);
  return NextResponse.json(
    { error: "No se pudo completar la operación" },
    { status: 500 },
  );
}
