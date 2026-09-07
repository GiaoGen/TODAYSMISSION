"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { prefetchNavigationRoute } from "@/features/navigation/model/navigation-prefetch";

export function RoutePrefetch({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    prefetchNavigationRoute(router, href);
  }, [href, router]);

  return null;
}
