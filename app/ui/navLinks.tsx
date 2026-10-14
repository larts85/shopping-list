"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveListId } from "@/app/lib/listClient";
import type { getHomeLists } from "@/app/actions/households";
import { getCurrentUser } from "@/app/actions/profile";

const mainLinks = [
  { href: "/", label: "Carritos" },
  { href: "/admin", label: "Administrar" },
  { href: "/catalog", label: "Solicitudes" },
  { href: "/history", label: "Historial" },
  { href: "/data", label: "Accesos" },
];
const adminLinks = [
  { href: "/admin/categories", label: "Categorías" },
  { href: "/admin/products", label: "Productos" },
];
export default function NavLinks({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const [hasPending, setHasPending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [listHref, setListHref] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const d = await getCurrentUser();
        if (active) setIsAdmin(d.role === "admin");
        const response = await fetch("/api/households?view=home", {
          cache: "no-store",
        });
        if (response.ok) {
          const data: Awaited<ReturnType<typeof getHomeLists>> =
            await response.json();
          if (active) setHasPending(data.invitations.length > 0);
          const list = data.lists.find((list) => list.id === getActiveListId());
          if (active) setListHref(list ? `/lists/${list.slug}` : "");
        }
      } catch {
        if (active) setIsAdmin(false);
      }
    };
    void refresh();
    window.addEventListener("active-list-changed", refresh);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("active-list-changed", refresh);
    };
  }, [pathname]);
  return (
    <nav
      aria-label={admin ? "Administración" : "Navegación principal"}
      className={
        admin
          ? "flex flex-wrap gap-2 sm:flex-col"
          : "flex w-full flex-nowrap gap-1 overflow-x-auto overflow-y-hidden pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
      }
    >
      {(admin
        ? adminLinks
        : [
            ...mainLinks.slice(0, 1),
            ...(listHref ? [{ href: listHref, label: "Lista" }] : []),
            ...mainLinks.slice(1),
          ].filter((l) => isAdmin || l.href !== "/admin")
      ).map(({ href, label }) => {
        const active =
          pathname === href ||
          (href === "/admin" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center justify-center rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${admin ? "flex-1 sm:justify-start" : ""} ${active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
          >
            {label}
            {href === "/" && hasPending && (
              <span className="ml-2 flex items-center">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-black ring-1 ring-white"
                />
                <span className="sr-only">
                  Invitaciones pendientes de aceptar o rechazar
                </span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
