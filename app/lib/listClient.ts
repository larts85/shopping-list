"use client";
const key = "home-logistics-active-list";
export function getActiveListId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(key) || undefined;
}
export function setActiveListId(id: string) {
  window.sessionStorage.setItem(key, id);
}
export function listFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const id = getActiveListId();
  if (id) headers.set("X-List-ID", id);
  return fetch(input, { ...init, headers });
}
