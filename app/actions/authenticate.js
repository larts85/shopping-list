"use server";
import { signIn, signOut } from "../../auth";

export async function doGoogleLogin(formData) {
  const requested = formData?.get("returnTo");
  const target =
    typeof requested === "string"
      ? requested.replace(/^\/logistic(?=\/)/, "")
      : requested;
  const redirectTo =
    typeof target === "string" && /^\/lists\/lista-[0-9a-f]{32}$/.test(target)
      ? target
      : "/";
  await signIn("google", { redirectTo });
}

export async function doGoogleLogout() {
  await signOut({ redirectTo: "/" });
}
