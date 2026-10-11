"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions/profile";

const mainLinks = [
  { href: "/logistic", label: "Mi lista" },
  { href: "/logistic/add", label: "Agregar" },
  { href: "/logistic/admin", label: "Administrar" },
  { href: "/logistic/catalog", label: "Solicitudes" },
  { href: "/logistic/history", label: "Historial" },
  { href: "/logistic/data", label: "Accesos" },
];
const adminLinks = [
  { href: "/logistic/admin/categories", label: "Categorías" },
  { href: "/logistic/admin/products", label: "Productos" },
];
export default function NavLinks({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const d = await getCurrentUser();
        if (active) setIsAdmin(d.role === "admin");
      } catch {
        if (active) setIsAdmin(false);
      }
    };
    void refresh();
    window.addEventListener("active-list-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("active-list-changed", refresh);
    };
  }, [pathname]);
  return (
    <nav
      aria-label={admin ? "Administración" : "Navegación principal"}
      className={admin ? "flex gap-2 sm:flex-col" : "flex flex-wrap gap-1"}
    >
      {(admin
        ? adminLinks
        : mainLinks.filter((l) => isAdmin || l.href !== "/logistic/admin")
      ).map(({ href, label }) => {
        const active =
          pathname === href ||
          (href === "/logistic/admin" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${admin ? "flex-1 sm:justify-start" : ""} ${active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
