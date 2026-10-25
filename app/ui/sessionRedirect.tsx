"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const authRequiredEvent = "home-logistics-auth-required";
const authRequiredHeader = "X-Auth-Required";

export default function SessionRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (pathname !== "/" && status === "unauthenticated") router.replace("/");
  }, [pathname, router, status]);

  useEffect(() => {
    const redirectToAuth = () => {
      if (window.location.pathname !== "/") router.replace("/");
    };

    window.addEventListener(authRequiredEvent, redirectToAuth);
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const request = args[0];
      const requestUrl =
        request instanceof Request
          ? request.url
          : request instanceof URL
            ? request.toString()
            : request;
      const url = new URL(requestUrl, window.location.href);
      if (
        url.origin === window.location.origin &&
        url.pathname.startsWith("/api/") &&
        response.headers.get(authRequiredHeader) === "true"
      ) {
        window.dispatchEvent(new Event(authRequiredEvent));
      }
      return response;
    };

    return () => {
      window.removeEventListener(authRequiredEvent, redirectToAuth);
      window.fetch = originalFetch;
    };
  }, [router]);

  return null;
}

SessionRedirect.displayName = "SessionRedirect";
