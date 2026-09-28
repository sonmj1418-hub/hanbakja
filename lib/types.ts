export type Level = 1 | 2 | 3;

export type Outcome =
  | "exit"
  | "watch"
  | "force-quit"
  | "timed-block"
  | "blocked-retry";

/** 계획서 UserSetting. level1 미만은 Level 1, level3 미만은 Level 2, 그 이상은 Level 3. */
export type Settings = {
  level1Threshold: number;
  level2Threshold: number;
  level3Threshold: number;
  notificationTime: string;
  notifyEnabled: boolean;
};

/** 계획서 UsageLog. duration 단위는 초. */
export type UsageLog = {
  usageId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  clipCount: number;
};

/** 계획서 InterventionLog. date는 기기 로컬 날짜. */
export type InterventionLog = {
  interventionId: string;
  timestamp: string;
  date: string;
  level: Level;
  reason: string;
  reasonNote: string;
  alternativeAction: string | null;
  alternativeCompleted: boolean;
  reEntered: boolean;
  blocked: boolean;
  blockDuration: number;
  usageSeconds: number;
  outcome: Outcome;
};

export type ActiveSession = {
  usageId: string;
  date: string;
  startTime: string;
  duration: number;
  clipCount: number;
  interventionId: string;
  levelAtStart: Level;
  lastTickAt: number;
};

export type BlockState = {
  until: string | null;
  minutes: number;
};

export type AppData = {
  settings: Settings;
  usageLogs: UsageLog[];
  interventions: InterventionLog[];
  activeSession: ActiveSession | null;
  block: BlockState;
  lastNotifiedDate: string | null;
};

export type DailyStats = {
  date: string;
  usageSeconds: number;
  clipCount: number;
  interventionCount: number;
  levelCounts: Record<Level, number>;
  topReason: string | null;
  reentryCount: number;
  blockCount: number;
  forceQuitCount: number;
  alternativeCompletedCount: number;
};

export type InterventionInput = Omit<
  InterventionLog,
  "interventionId" | "timestamp" | "date"
>;
