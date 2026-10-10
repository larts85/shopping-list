"use server";
import { signIn, signOut } from "../../auth";

export async function doGoogleLogin() {
  await signIn("google", { redirectTo: "/logistic" });
}

export async function doGoogleLogout() {
  await signOut({ redirectTo: "/" });
}
