import { NextResponse } from "next/server";
import { DataError } from "./database";
import { randomUUID } from "node:crypto";

export function apiError(error: unknown, request?: Request) {
  const errorId = randomUUID();
  if (error instanceof DataError)
    return NextResponse.json(
      { error: error.message, errorId },
      { status: error.status, headers: { "X-Error-ID": errorId } },
    );
  const details = error as {
    code?: string;
    constraint?: string;
    name?: string;
    message?: string;
    stack?: string;
  };
  const code = details?.code;
  if (code === "23503")
    return NextResponse.json(
      {
        error:
          "La categoría tiene productos asociados o la referencia no existe",
        errorId,
      },
      { status: 409, headers: { "X-Error-ID": errorId } },
    );
  if (code === "23505")
    return NextResponse.json({ error: "El registro ya existe", errorId }, {
      status: 409,
      headers: { "X-Error-ID": errorId },
    });
  if (code === "23514" || code === "22P02" || error instanceof SyntaxError)
    return NextResponse.json({ error: "Datos inválidos", errorId }, {
      status: 400,
      headers: { "X-Error-ID": errorId },
    });
  console.error("API request failed", {
    errorId,
    method: request?.method,
    path: request ? new URL(request.url).pathname : undefined,
    vercelRequestId: request?.headers.get("x-vercel-id") ?? undefined,
    errorName: details?.name,
    errorCode: details?.code,
    constraint: details?.constraint,
    message: details?.message,
    stack: details?.stack,
  });
  return NextResponse.json(
    { error: "No se pudo completar la operación", errorId },
    { status: 500, headers: { "X-Error-ID": errorId } },
  );
}
