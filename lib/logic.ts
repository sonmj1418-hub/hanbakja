import type {
  AppData,
  DailyStats,
  InterventionLog,
  Level,
  Settings,
} from "./types.ts";

export const REASONS: { id: string; hint: string }[] = [
  { id: "심심해서", hint: "특별한 목적 없이 시간을 보내려고" },
  { id: "습관적으로", hint: "별다른 생각 없이 반복해서" },
  { id: "잠깐 보려고", hint: "짧은 시간만 이용하려고" },
  { id: "스트레스 해소를 위해", hint: "기분 전환이나 휴식을 위해" },
  { id: "특별한 이유 없이", hint: "명확한 실행 목적이 없어서" },
  { id: "기타", hint: "위 항목에 해당하지 않는 경우" },
];

export type Alternative = {
  id: string;
  label: string;
  seconds: number;
  guide: string;
};

export const ALTERNATIVES: Alternative[] = [
  {
    id: "water",
    label: "물 마시기",
    seconds: 20,
    guide: "자리에서 일어나 물 한 잔을 마시고 오세요.",
  },
  {
    id: "stretch",
    label: "간단한 스트레칭",
    seconds: 30,
    guide: "어깨를 천천히 돌리고, 목을 좌우로 기울여 보세요.",
  },
  {
    id: "read",
    label: "5분 독서",
    seconds: 60,
    guide:
      "손에 잡히는 글에서 한 단락만 읽으세요. 브라우저 안내 시간은 1분입니다.",
  },
  {
    id: "walk",
    label: "잠시 걷기",
    seconds: 45,
    guide: "방 안이라도 열 걸음만 걸어 보세요.",
  },
  {
    id: "eyes",
    label: "눈 쉬기",
    seconds: 20,
    guide: "화면에서 눈을 떼고, 멀리 있는 한 점을 바라보세요.",
  },
  {
    id: "breath",
    label: "호흡하기",
    seconds: 30,
    guide: "넷을 들이쉬고, 넷을 멈추고, 여섯을 내쉬세요.",
  },
];

const REASON_ALT: Record<string, string> = {
  심심해서: "잠시 걷기",
  습관적으로: "호흡하기",
  "잠깐 보려고": "눈 쉬기",
  "스트레스 해소를 위해": "간단한 스트레칭",
  "특별한 이유 없이": "물 마시기",
  기타: "호흡하기",
};

export const LEVEL_SUMMARY: Record<Level, string> = {
  1: "질문 후 5초 대기",
  2: "질문 후 대체행동",
  3: "경고 후 차단",
};

export const OUTCOME_LABEL = {
  exit: "나가기",
  watch: "시청함",
  "force-quit": "강제 종료",
  "timed-block": "시간 차단",
  "blocked-retry": "차단 중 다시 열기",
} as const;

export const BLOCK_MINUTES = [10, 20, 30, 60] as const;

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatKoreanDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const week = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${y}년 ${m}월 ${d}일 (${week})`;
}

export function formatShortDate(dateKey: string, today = todayKey()): string {
  if (dateKey === today) return "오늘";
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0 && seconds === 0) return `${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

export function formatReportDuration(totalSeconds: number): string {
  return formatClock(totalSeconds);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function levelForUsage(seconds: number, settings: Settings): Level {
  const minutes = seconds / 60;
  if (minutes < settings.level1Threshold) return 1;
  if (minutes < settings.level3Threshold) return 2;
  return 3;
}

export function usageSecondsOn(data: AppData, date: string): number {
  return data.usageLogs
    .filter((log) => log.date === date)
    .reduce((sum, log) => sum + log.duration, 0);
}

export function nextLevelGap(
  seconds: number,
  settings: Settings,
): { label: string; remainSeconds: number } | null {
  const minutes = seconds / 60;
  if (minutes < settings.level1Threshold) {
    return {
      label: "Level 2까지",
      remainSeconds: settings.level1Threshold * 60 - seconds,
    };
  }
  if (minutes < settings.level3Threshold) {
    return {
      label: "Level 3까지",
      remainSeconds: settings.level3Threshold * 60 - seconds,
    };
  }
  return null;
}

export function recommendAlternative(reason: string): Alternative {
  const label = REASON_ALT[reason] ?? "호흡하기";
  return ALTERNATIVES.find((item) => item.label === label) ?? ALTERNATIVES[5];
}

export function isBlocked(block: AppData["block"], now = Date.now()): boolean {
  if (!block.until) return false;
  return new Date(block.until).getTime() > now;
}

export function blockRemainingSeconds(
  block: AppData["block"],
  now = Date.now(),
): number {
  if (!block.until) return 0;
  return Math.max(0, (new Date(block.until).getTime() - now) / 1000);
}

export function blockUntilFromMinutes(
  minutes: number,
  timeScale: number,
  now = Date.now(),
): string {
  const realMs = (minutes * 60 * 1000) / Math.max(1, timeScale);
  return new Date(now + realMs).toISOString();
}

export function isReportDue(
  notificationTime: string,
  now = new Date(),
): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(notificationTime);
  if (!match) return false;
  const target = new Date(now);
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return now.getTime() >= target.getTime();
}

export function normalizeClock(value: string): string | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${match[1]}:${match[2]}`;
}

export function validateSettings(input: {
  level1Threshold: number;
  level3Threshold: number;
  notificationTime: string;
  timeScale: number;
}): string | null {
  if (
    !Number.isInteger(input.level1Threshold) ||
    input.level1Threshold < 1 ||
    input.level1Threshold > 240
  ) {
    return "Level 2가 시작되는 시간은 1분에서 240분 사이의 정수여야 합니다.";
  }
  if (
    !Number.isInteger(input.level3Threshold) ||
    input.level3Threshold <= input.level1Threshold ||
    input.level3Threshold > 360
  ) {
    return "Level 3 시작 시간은 Level 2 시작보다 크고, 360분 이하의 정수여야 합니다.";
  }
  if (!normalizeClock(input.notificationTime)) {
    return "알림 시각을 다시 확인해 주세요.";
  }
  if (input.timeScale !== 1 && input.timeScale !== 30 && input.timeScale !== 60) {
    return "시간 가속은 1배, 30배, 60배 중에서 고르세요.";
  }
  return null;
}

export function lastDates(count: number, from = new Date()): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(from);
    day.setDate(from.getDate() - i);
    dates.push(todayKey(day));
  }
  return dates;
}

export function statsForDate(data: AppData, date: string): DailyStats {
  const usage = data.usageLogs.filter((log) => log.date === date);
  const interventions = data.interventions.filter((log) => log.date === date);
  const levelCounts: Record<Level, number> = { 1: 0, 2: 0, 3: 0 };
  const reasonCounts = new Map<string, { count: number; latest: number }>();

  interventions.forEach((log, index) => {
    levelCounts[log.level] += 1;
    if (!log.reason || log.reason === "선택하지 않음" || log.outcome === "blocked-retry") {
      return;
    }
    const prev = reasonCounts.get(log.reason) ?? { count: 0, latest: -1 };
    reasonCounts.set(log.reason, { count: prev.count + 1, latest: index });
  });

  let topReason: string | null = null;
  let best = { count: 0, latest: -1 };
  for (const [reason, info] of reasonCounts) {
    if (info.count > best.count || (info.count === best.count && info.latest > best.latest)) {
      best = info;
      topReason = reason;
    }
  }

  return {
    date,
    usageSeconds: usage.reduce((sum, log) => sum + log.duration, 0),
    clipCount: usage.reduce((sum, log) => sum + log.clipCount, 0),
    interventionCount: interventions.length,
    levelCounts,
    topReason,
    reentryCount: interventions.filter((log) => log.level === 2 && log.reEntered)
      .length,
    blockCount: interventions.filter((log) => log.outcome === "timed-block").length,
    forceQuitCount: interventions.filter((log) => log.outcome === "force-quit")
      .length,
    alternativeCompletedCount: interventions.filter((log) => log.alternativeCompleted)
      .length,
  };
}

export function reportLines(stats: DailyStats): string[] {
  return [
    `총 사용시간 : ${formatReportDuration(stats.usageSeconds)}`,
    `실행 횟수 : ${stats.clipCount}회`,
    `개입 횟수 : ${stats.interventionCount}회`,
    `Level 1 : ${stats.levelCounts[1]}회`,
    `Level 2 : ${stats.levelCounts[2]}회`,
    `Level 3 : ${stats.levelCounts[3]}회`,
    `가장 많이 선택한 이유 : ${stats.topReason ?? "없음"}`,
    `대체행동 후 재실행 : ${stats.reentryCount}회`,
    `차단 : ${stats.blockCount}회`,
  ];
}

export function applyFlush(
  data: AppData,
  visible: boolean,
  now = Date.now(),
): AppData {
  const session = data.activeSession;
  if (!session) return data;
  const elapsedMs = Math.min(2000, Math.max(0, now - session.lastTickAt));
  const addSeconds = visible ? (elapsedMs / 1000) * data.settings.timeScale : 0;
  const duration = session.duration + addSeconds;
  const activeSession = { ...session, duration, lastTickAt: now };
  const usageLogs = data.usageLogs.map((log) =>
    log.usageId === session.usageId
      ? {
          ...log,
          duration,
          clipCount: session.clipCount,
          endTime: new Date(now).toISOString(),
        }
      : log,
  );
  return { ...data, activeSession, usageLogs };
}

export function finalizeSession(data: AppData, now = Date.now()): AppData {
  if (!data.activeSession) return data;
  const session = data.activeSession;
  const hasLog = data.usageLogs.some((log) => log.usageId === session.usageId);
  const usageLogs = hasLog
    ? data.usageLogs.map((log) =>
        log.usageId === session.usageId
          ? {
              ...log,
              duration: session.duration,
              clipCount: session.clipCount,
              endTime: new Date(now).toISOString(),
            }
          : log,
      )
    : [
        ...data.usageLogs,
        {
          usageId: session.usageId,
          date: session.date,
          startTime: session.startTime,
          endTime: new Date(now).toISOString(),
          duration: session.duration,
          clipCount: session.clipCount,
        },
      ];
  return { ...data, usageLogs, activeSession: null };
}

export function withClip(data: AppData): AppData {
  if (!data.activeSession) return data;
  const clipCount = data.activeSession.clipCount + 1;
  const activeSession = { ...data.activeSession, clipCount };
  const usageLogs = data.usageLogs.map((log) =>
    log.usageId === activeSession.usageId ? { ...log, clipCount } : log,
  );
  return { ...data, activeSession, usageLogs };
}

export function reasonLabel(log: Pick<InterventionLog, "reason" | "reasonNote">): string {
  if (log.reason === "기타" && log.reasonNote.trim()) {
    return `기타 · ${log.reasonNote.trim()}`;
  }
  return log.reason || "기록 없음";
}
