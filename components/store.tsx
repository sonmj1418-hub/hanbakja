"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addExternalWatch,
  applyFlush,
  blockUntilFromMinutes,
  finalizeSession,
  isReportDue,
  reportLines,
  statsForDate,
  todayKey,
  withClip,
} from "@/lib/logic";
import { clearData, defaultData, loadData, saveData } from "@/lib/storage";
import type { AppData, InterventionInput, Level, Settings } from "@/lib/types";

type StoreContextValue = {
  ready: boolean;
  corrupt: boolean;
  saveError: string | null;
  data: AppData | null;
  permission: NotificationPermission | "unsupported";
  reload: () => void;
  reset: () => void;
  dismissSaveError: () => void;
  saveSettings: (settings: Settings) => void;
  recordIntervention: (input: InterventionInput) => string;
  startWatching: (level: Level, interventionId: string) => void;
  flushWatch: (visible: boolean) => void;
  advanceClip: () => void;
  stopWatching: () => void;
  addExternalWatch: (realSeconds: number, intoActiveSession: boolean) => void;
  beginBlock: (minutes: number) => void;
  cancelDetach: () => void;
  scheduleDetach: () => void;
  requestNotificationPermission: () => Promise<string | null>;
  previewNotification: () => string | null;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [corrupt, setCorrupt] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const dataRef = useRef<AppData | null>(null);
  const detachRef = useRef<number | null>(null);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    try {
      saveData(next);
      setSaveError(null);
    } catch {
      setSaveError(
        "이 브라우저에 기록을 저장하지 못했습니다. 저장 공간이 가득 찼을 수 있습니다.",
      );
    }
    setData(next);
  }, []);

  const update = useCallback(
    (recipe: (current: AppData) => AppData) => {
      setData((current) => {
        if (!current) return current;
        const next = recipe(current);
        dataRef.current = next;
        try {
          saveData(next);
          setSaveError(null);
        } catch {
          setSaveError(
            "이 브라우저에 기록을 저장하지 못했습니다. 저장 공간이 가득 찼을 수 있습니다.",
          );
        }
        return next;
      });
    },
    [],
  );

  const readPermission = useCallback(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    try {
      const loaded = loadData();
      const next = loaded.corrupt ? null : loaded.data;
      dataRef.current = next;
      // localStorage is read after mount so the server and first client paint match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCorrupt(loaded.corrupt);
      setData(next);
      if (!loaded.corrupt) {
        try {
          saveData(loaded.data);
        } catch {
          setSaveError(
            "이 브라우저에 기록을 저장하지 못했습니다. 저장 공간이 가득 찼을 수 있습니다.",
          );
        }
      }
    } catch {
      setCorrupt(true);
      setData(null);
    } finally {
      setReady(true);
      readPermission();
    }
  }, [readPermission]);

  const reload = useCallback(() => {
    const loaded = loadData();
    setCorrupt(loaded.corrupt);
    setData(loaded.corrupt ? null : loaded.data);
    setSaveError(null);
  }, []);

  const reset = useCallback(() => {
    clearData();
    const fresh = defaultData();
    commit(fresh);
    setCorrupt(false);
  }, [commit]);

  const dismissSaveError = useCallback(() => setSaveError(null), []);

  const saveSettings = useCallback(
    (settings: Settings) => {
      update((current) => ({ ...current, settings }));
    },
    [update],
  );

  const recordIntervention = useCallback(
    (input: InterventionInput) => {
      const id = crypto.randomUUID();
      const now = new Date();
      update((current) => ({
        ...current,
        interventions: [
          ...current.interventions,
          {
            ...input,
            interventionId: id,
            timestamp: now.toISOString(),
            date: todayKey(now),
          },
        ],
      }));
      return id;
    },
    [update],
  );

  const startWatching = useCallback(
    (level: Level, interventionId: string) => {
      const now = Date.now();
      update((current) => {
        const settled = finalizeSession(current, now);
        const usageId = crypto.randomUUID();
        const startTime = new Date(now).toISOString();
        const date = todayKey(new Date(now));
        return {
          ...settled,
          activeSession: {
            usageId,
            date,
            startTime,
            duration: 0,
            clipCount: 1,
            interventionId,
            levelAtStart: level,
            lastTickAt: now,
          },
          usageLogs: [
            ...settled.usageLogs,
            {
              usageId,
              date,
              startTime,
              endTime: startTime,
              duration: 0,
              clipCount: 1,
            },
          ],
        };
      });
    },
    [update],
  );

  const flushWatch = useCallback(
    (visible: boolean) => {
      update((current) => applyFlush(current, visible));
    },
    [update],
  );

  const advanceClip = useCallback(() => {
    update((current) => withClip(current));
  }, [update]);

  const cancelDetach = useCallback(() => {
    if (detachRef.current !== null) {
      window.clearTimeout(detachRef.current);
      detachRef.current = null;
    }
  }, []);

  const stopWatching = useCallback(() => {
    cancelDetach();
    update((current) => {
      const visible =
        typeof document === "undefined" || document.visibilityState === "visible";
      return finalizeSession(applyFlush(current, visible));
    });
  }, [cancelDetach, update]);

  const scheduleDetach = useCallback(() => {
    cancelDetach();
    update((current) => {
      const visible =
        typeof document === "undefined" || document.visibilityState === "visible";
      return applyFlush(current, visible);
    });
    detachRef.current = window.setTimeout(() => {
      detachRef.current = null;
      update((current) => finalizeSession(current));
    }, 400);
  }, [cancelDetach, update]);

  const addExternalWatchSeconds = useCallback(
    (realSeconds: number, intoActiveSession: boolean) => {
      update((current) =>
        addExternalWatch(
          current,
          realSeconds,
          intoActiveSession,
          Date.now(),
          crypto.randomUUID(),
        ),
      );
    },
    [update],
  );

  const beginBlock = useCallback(
    (minutes: number) => {
      update((current) => ({
        ...current,
        block: {
          minutes,
          until: blockUntilFromMinutes(minutes),
        },
      }));
    },
    [update],
  );

  const notifyToday = useCallback((current: AppData) => {
    if (!current.settings.notifyEnabled) return "알림이 꺼져 있습니다.";
    if (typeof Notification === "undefined") {
      return "이 브라우저는 알림을 지원하지 않습니다.";
    }
    if (Notification.permission !== "granted") {
      return "브라우저 알림 권한이 없습니다.";
    }
    const stats = statsForDate(current, todayKey());
    const body = reportLines(stats).slice(0, 4).join(" · ");
    new Notification("오늘의 Shorts 사용 리포트", { body, lang: "ko" });
    return null;
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return "이 브라우저는 알림을 지원하지 않습니다.";
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "denied") {
      return "알림이 차단되어 있습니다. 브라우저 사이트 설정에서 허용해 주세요.";
    }
    if (result !== "granted") return "알림 권한을 허용하지 않았습니다.";
    return null;
  }, []);

  const previewNotification = useCallback(() => {
    const current = dataRef.current;
    if (!current) return "기록을 아직 불러오지 못했습니다.";
    return notifyToday(current);
  }, [notifyToday]);

  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const current = dataRef.current;
      if (!current || !current.settings.notifyEnabled) return;
      if (!isReportDue(current.settings.notificationTime)) return;
      const today = todayKey();
      if (current.lastNotifiedDate === today) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return;
      }
      const error = notifyToday(current);
      if (error) return;
      update((latest) => ({ ...latest, lastNotifiedDate: todayKey() }));
    };
    check();
    const id = window.setInterval(check, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [notifyToday, ready, update]);

  const value = useMemo<StoreContextValue>(
    () => ({
      ready,
      corrupt,
      saveError,
      data,
      permission,
      reload,
      reset,
      dismissSaveError,
      saveSettings,
      recordIntervention,
      startWatching,
      flushWatch,
      advanceClip,
      stopWatching,
      addExternalWatch: addExternalWatchSeconds,
      beginBlock,
      cancelDetach,
      scheduleDetach,
      requestNotificationPermission,
      previewNotification,
    }),
    [
      ready,
      corrupt,
      saveError,
      data,
      permission,
      reload,
      reset,
      dismissSaveError,
      saveSettings,
      recordIntervention,
      startWatching,
      flushWatch,
      advanceClip,
      stopWatching,
      addExternalWatchSeconds,
      beginBlock,
      cancelDetach,
      scheduleDetach,
      requestNotificationPermission,
      previewNotification,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreProvider가 필요합니다.");
  return value;
}
