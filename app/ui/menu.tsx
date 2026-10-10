import Link from "next/link";
import { doGoogleLogout } from "../actions/authenticate";
import { auth } from "../../auth";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function Menu() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <nav className="bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-8">
            <Link
              href="/logistic/"
              className="text-base font-normal text-black hover:opacity-70 transition-opacity"
            >
              Lista
            </Link>
            <Link
              href="/logistic/add"
              className="text-base font-normal text-black hover:opacity-70 transition-opacity"
            >
              Agregar
            </Link>
            <Link
              href="/logistic/admin"
              className="text-base font-normal text-black hover:opacity-70 transition-opacity"
            >
              Admin
            </Link>
            <Link
              href="/logistic/data"
              className="text-base font-normal text-black hover:opacity-70 transition-opacity"
            >
              Datos
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <p className="hidden sm:block text-base text-gray-600">{session?.user?.name}</p>
            {session?.user?.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                loading="eager"
                width={36}
                height={36}
                className="rounded-full"
              />
            )}
            <form action={doGoogleLogout}>
              <button
                type="submit"
                className="text-base font-normal text-black hover:opacity-70 transition-opacity"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
