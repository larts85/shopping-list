"use client";
const key = "home-logistics-active-list";
export function getActiveListId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(key) || undefined;
}
export function setActiveListId(id: string) {
  if (window.sessionStorage.getItem(key) === id) return;
  window.sessionStorage.setItem(key, id);
  window.dispatchEvent(new Event("active-list-changed"));
}
export function clearActiveListId() {
  window.sessionStorage.removeItem(key);
}
export function listFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const id = getActiveListId();
  if (id) headers.set("X-List-ID", id);
  return fetch(input, { ...init, headers });
}
