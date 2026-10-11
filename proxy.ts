"use server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";

export async function proxy(request: NextRequest) {
  try {
    // Verificar si el usuario está autenticado
    const session = await auth();

    if (!session) {
      // Si no está autenticado, redirigir a la página principal
      const login = new URL("/", request.url);
      login.searchParams.set("returnTo", request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }

    // Si está autenticado, permitir el acceso
    return NextResponse.next();
  } catch (error) {
    console.error("Error in proxy:", error);
    const login = new URL("/", request.url);
    login.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/logistic/:path*"],
};
