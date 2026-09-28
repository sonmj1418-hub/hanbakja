"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/components/store";
import {
  clearGuardSession,
  HanbakjaGuard,
  hasGuardSession,
  isGuardTarget,
  isNativeAndroid,
} from "@/lib/guard";

export function GuardBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, addExternalWatch, stopWatching } = useStore();

  useEffect(() => {
    if (!ready || !isNativeAndroid()) return;
    let stopped = false;

    async function sync() {
      try {
        const status = await HanbakjaGuard.getStatus();
        if (stopped) return;
        if (
          status.blockerEnabled &&
          isGuardTarget(status.pendingTarget) &&
          !pathname.startsWith("/watch")
        ) {
          router.push(`/watch?guard=${status.pendingTarget}`);
        }
        const taken = await HanbakjaGuard.takeWatch();
        if (stopped) return;
        const guardSession = hasGuardSession();
        if (taken.seconds > 0) {
          addExternalWatch(taken.seconds, guardSession);
        }
        if (taken.ended && guardSession) {
          clearGuardSession();
          stopWatching();
        }
      } catch {
        // The browser build has no accessibility service.
      }
    }

    void sync();
    const id = window.setInterval(() => void sync(), 1500);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [addExternalWatch, pathname, ready, router, stopWatching]);

  return null;
}
