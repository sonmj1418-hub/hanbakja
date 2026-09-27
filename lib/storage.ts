import { finalizeSession } from "./logic.ts";
import type {
  ActiveSession,
  AppData,
  BlockState,
  InterventionLog,
  Settings,
  UsageLog,
} from "./types.ts";

export const STORAGE_KEY = "hanbakja.v1";

export function defaultSettings(): Settings {
  return {
    level1Threshold: 10,
    level2Threshold: 20,
    level3Threshold: 20,
    notificationTime: "21:00",
    timeScale: 1,
    notifyEnabled: true,
  };
}

export function defaultData(): AppData {
  return {
    settings: defaultSettings(),
    usageLogs: [],
    interventions: [],
    activeSession: null,
    block: { until: null, minutes: 0 },
    lastNotifiedDate: null,
  };
}

function isLevel(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function isUsageLog(value: unknown): value is UsageLog {
  if (!value || typeof value !== "object") return false;
  const log = value as UsageLog;
  return (
    typeof log.usageId === "string" &&
    typeof log.date === "string" &&
    typeof log.startTime === "string" &&
    typeof log.endTime === "string" &&
    typeof log.duration === "number" &&
    typeof log.clipCount === "number"
  );
}

function isIntervention(value: unknown): value is InterventionLog {
  if (!value || typeof value !== "object") return false;
  const log = value as InterventionLog;
  return (
    typeof log.interventionId === "string" &&
    typeof log.timestamp === "string" &&
    typeof log.date === "string" &&
    isLevel(log.level) &&
    typeof log.reason === "string" &&
    typeof log.reEntered === "boolean" &&
    typeof log.blocked === "boolean"
  );
}

function readSettings(value: unknown): Settings | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Settings>;
  const defaults = defaultSettings();
  const level1 = Number(raw.level1Threshold ?? defaults.level1Threshold);
  const level3 = Number(raw.level3Threshold ?? defaults.level3Threshold);
  const scale = raw.timeScale;
  const timeScale = scale === 30 || scale === 60 || scale === 1 ? scale : 1;
  const notificationTime =
    typeof raw.notificationTime === "string" &&
    /^\d{2}:\d{2}$/.test(raw.notificationTime)
      ? raw.notificationTime
      : defaults.notificationTime;
  if (!Number.isFinite(level1) || !Number.isFinite(level3) || level3 <= level1) {
    return null;
  }
  return {
    level1Threshold: level1,
    level2Threshold: level3,
    level3Threshold: level3,
    notificationTime,
    timeScale,
    notifyEnabled: raw.notifyEnabled !== false,
  };
}

function readBlock(value: unknown): BlockState {
  if (!value || typeof value !== "object") return { until: null, minutes: 0 };
  const raw = value as Partial<BlockState>;
  return {
    until: typeof raw.until === "string" ? raw.until : null,
    minutes: typeof raw.minutes === "number" ? raw.minutes : 0,
  };
}

function readSession(value: unknown): ActiveSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ActiveSession>;
  if (
    typeof raw.usageId !== "string" ||
    typeof raw.date !== "string" ||
    typeof raw.startTime !== "string" ||
    typeof raw.duration !== "number" ||
    typeof raw.clipCount !== "number" ||
    !isLevel(raw.levelAtStart)
  ) {
    return null;
  }
  return {
    usageId: raw.usageId,
    date: raw.date,
    startTime: raw.startTime,
    duration: raw.duration,
    clipCount: raw.clipCount,
    interventionId:
      typeof raw.interventionId === "string" ? raw.interventionId : "",
    levelAtStart: raw.levelAtStart,
    lastTickAt: typeof raw.lastTickAt === "number" ? raw.lastTickAt : Date.now(),
  };
}

export function normalizeData(value: unknown): AppData | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<AppData>;
  if (!Array.isArray(raw.usageLogs) || !Array.isArray(raw.interventions)) {
    return null;
  }
  if (!raw.usageLogs.every(isUsageLog) || !raw.interventions.every(isIntervention)) {
    return null;
  }
  const settings = readSettings(raw.settings);
  if (!settings) return null;
  const interventions = raw.interventions.map((log) => ({
    ...log,
    reasonNote: typeof log.reasonNote === "string" ? log.reasonNote : "",
    alternativeAction:
      typeof log.alternativeAction === "string" ? log.alternativeAction : null,
    alternativeCompleted: Boolean(log.alternativeCompleted),
    blockDuration: typeof log.blockDuration === "number" ? log.blockDuration : 0,
    usageSeconds: typeof log.usageSeconds === "number" ? log.usageSeconds : 0,
    outcome: log.outcome ?? (log.reEntered ? "watch" : "exit"),
  }));
  return {
    settings,
    usageLogs: raw.usageLogs,
    interventions,
    activeSession: readSession(raw.activeSession),
    block: readBlock(raw.block),
    lastNotifiedDate:
      typeof raw.lastNotifiedDate === "string" ? raw.lastNotifiedDate : null,
  };
}

export function loadData(): { data: AppData; corrupt: boolean } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: defaultData(), corrupt: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    const data = normalizeData(parsed);
    if (!data) return { data: defaultData(), corrupt: true };
    return { data: finalizeSession(data), corrupt: false };
  } catch {
    return { data: defaultData(), corrupt: true };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
