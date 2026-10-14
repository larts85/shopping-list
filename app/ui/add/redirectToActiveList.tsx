"use client";

import { getHouseholdData } from "@/app/actions/households";
import { getActiveListId } from "@/app/lib/listClient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RedirectToActiveList() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void getHouseholdData(getActiveListId())
      .then((data) => {
        if (!cancelled) router.replace(`/lists/${data.household.slug}`);
      })
      .catch(() => {
        if (!cancelled) router.replace("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <p role="status">Abriendo tu lista activa…</p>;
}

RedirectToActiveList.displayName = 'RedirectToActiveList';
