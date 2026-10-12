import Menu from "../ui/menu";
import ListAccessProvider from "../ui/list/listAccessProvider";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await auth())?.user?.email) redirect("/");
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:p-4"
      >
        Ir al contenido
      </a>
      <Menu />
      <div
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12"
      >
        <ListAccessProvider>{children}</ListAccessProvider>
      </div>
    </div>
  );
}
