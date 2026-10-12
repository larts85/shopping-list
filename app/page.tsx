import Authenticate from "./ui/authenticate";
import "./globals.css";
import { auth } from "@/auth";
import Menu from "./ui/menu";
import HomeLists from "./ui/list/homeLists";
import { defaultListName } from "./lib/listName";

export const metadata = { title: "Carritos" };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  if ((await auth())?.user?.email) {
    return (
      <div className="min-h-screen">
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Ir al contenido
        </a>
        <Menu />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12"
        >
          <HomeLists defaultName={defaultListName()} />
        </main>
      </div>
    );
  }
  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Authenticate returnTo={returnTo} />
      </div>
    </main>
  );
}
