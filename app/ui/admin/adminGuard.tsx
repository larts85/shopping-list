"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/actions/profile";
export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const check = async () => {
      setAllowed(false);
      try {
        const data = await getCurrentUser();
        if (active) {
          if (data.role !== "admin") router.replace("/");
          else setAllowed(true);
        }
      } catch {
        if (active) router.replace("/");
      }
    };
    void check();
    window.addEventListener("active-list-changed", check);
    return () => {
      active = false;
      window.removeEventListener("active-list-changed", check);
    };
  }, [router]);
  return allowed ? children : <p role="status">Comprobando permisos…</p>;
}

AdminGuard.displayName = 'AdminGuard';
