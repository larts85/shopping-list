import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SideMenu() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <aside className="bg-white border-r border-gray-200 w-64 min-h-screen">
      <div className="flex flex-col gap-1 p-8">
        <h2 className="text-sm font-normal text-gray-600 mb-6">Administración</h2>
        <Link
          href="/logistic/admin/categories"
          className="px-4 py-3 text-base font-normal text-black hover:opacity-70 transition-opacity"
        >
          Categorías
        </Link>
        <Link
          href="/logistic/admin/products"
          className="px-4 py-3 text-base font-normal text-black hover:opacity-70 transition-opacity"
        >
          Productos
        </Link>
      </div>
    </aside>
  );
}
