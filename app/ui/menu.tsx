import Link from "next/link";
import { doGoogleLogout } from "../actions/authenticate";
import { auth } from "../../auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import NavLinks from "./navLinks";

export default async function Menu() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex min-h-20 items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-lg text-white"
            >
              I
            </span>
            <span>Inicio</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-zinc-500 md:block">
              {session.user.name}
            </span>
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || "Perfil"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <form action={doGoogleLogout}>
              <button type="submit" className="btn-secondary">
                Salir
              </button>
            </form>
          </div>
        </div>
        <div className="pb-3 sm:max-w-lg">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}

Menu.displayName = 'Menu';
