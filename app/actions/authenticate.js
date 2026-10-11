"use server";
import { signIn, signOut } from "../../auth";

export async function doGoogleLogin(formData) {
  const target = formData?.get("returnTo");
  const redirectTo =
    typeof target === "string" &&
    /^\/logistic\/lists\/lista-[0-9a-f]{32}$/.test(target)
      ? target
      : "/logistic";
  await signIn("google", { redirectTo });
}

export async function doGoogleLogout() {
  await signOut({ redirectTo: "/" });
}
