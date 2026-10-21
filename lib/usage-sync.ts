import type { SyncConfig } from "./sync-config.ts";
import type { InterventionLog, LockAttempt, UsageLog } from "./types.ts";

/**
 * 서버로 올리는 집계. 로컬 SQLite가 화면에 보이는 기록이고, 이 모듈은 그 다음이다.
 * 이유 글, 성찰, 피드백 글, 공부 카드 내용, 설정 값, 화면에서 읽은 글은 넣지 않는다.
 */

const METHODS = new Set(["pause", "framing", "breath", "alternative", "reflection", "card", "warning"]);
const STAGES = new Set(["entry", "commit_end", "strong", "web", "locked", "pip"]);
const OUTCOMES = new Set([
  "exit",
  "watch",
  "force-quit",
  "timed-block",
  "blocked-retry",
  "kept",
  "extend",
  "day-end",
  "overdraft",
  "budget-out",
  "interrupted",
]);
const WATCH_OUTCOMES = new Set(["watch", "extend", "overdraft", "budget-out", "interrupted"]);
const POLICY_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,31}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SessionUpload = {
  event_id: string;
  install_id: string;
  target: UsageLog["target"];
  source: UsageLog["source"];
  started_at: string;
  ended_at: string;
  duration_sec: number;
  clip_count: number;
};

export type InterventionUpload = {
  event_id: string;
  install_id: string;
  created_at: string;
  weekday: number;
  intensity: number;
  stage: string | null;
  method: string | null;
  commit_minutes: number;
  card_correct: boolean | null;
  outcome: string;
  reentered_within_30min: boolean | null;
  policy_version: string | null;
};

export type LockUpload = {
  event_id: string;
  install_id: string;
  created_at: string;
  remaining_sec: number;
};

export type Outbox = {
  sessions: SessionUpload[];
  interventions: InterventionUpload[];
  locks: LockUpload[];
  /** 이미 서버가 받은 event_id. 같은 줄을 다시 보내지 않는다. */
  sent: string[];
  /** 기록 초기화의 서버 삭제가 실패해 다음에 다시 지워야 하는지. */
  pendingDelete: boolean;
  /** 서버 삭제가 실패했을 때 남겨 두는 event_id. */
  deleteEventIds: string[];
};

type EnqueueOp =
  | { kind: "session"; row: UsageLog }
  | { kind: "intervention"; row: InterventionLog }
  | { kind: "lock"; row: LockAttempt }
  | { kind: string };

export function emptyOutbox(): Outbox {
  return { sessions: [], interventions: [], locks: [], sent: [], pendingDelete: false, deleteEventIds: [] };
}

export function isServerConfigured(config: SyncConfig): boolean {
  const url = config.url.trim();
  const key = config.anonKey.trim();
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function knownMethod(value: unknown): string | null {
  return typeof value === "string" && METHODS.has(value) ? value : null;
}

export function knownStage(value: unknown): string | null {
  return typeof value === "string" && STAGES.has(value) ? value : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function isIso(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

/** 재진입 여부가 아직 없으면 올리지 않는다. 시청을 고른 줄은 계속 null이라 바로 올린다. */
export function interventionReady(log: Pick<InterventionLog, "outcome" | "reenteredWithin30">): boolean {
  if (log.reenteredWithin30 !== null) return true;
  return WATCH_OUTCOMES.has(log.outcome);
}

export function toSessionUpload(log: UsageLog, installId: string): SessionUpload | null {
  if (!isUuid(log.usageId) || !isUuid(installId)) return null;
  if (log.target !== "youtube" && log.target !== "instagram" && log.target !== "practice") return null;
  if (log.source !== "native" && log.source !== "web") return null;
  if (!isIso(log.startTime) || !isIso(log.endTime)) return null;
  if (!Number.isFinite(log.duration) || !Number.isFinite(log.clipCount)) return null;
  return {
    event_id: log.usageId,
    install_id: installId,
    target: log.target,
    source: log.source,
    started_at: log.startTime,
    ended_at: log.endTime,
    duration_sec: Math.max(0, log.duration),
    clip_count: Math.max(0, Math.round(log.clipCount)),
  };
}

export function toInterventionUpload(log: InterventionLog, installId: string): InterventionUpload | null {
  if (!isUuid(log.interventionId) || !isUuid(installId)) return null;
  if (!interventionReady(log)) return null;
  if (!isIso(log.timestamp)) return null;
  if (!OUTCOMES.has(log.outcome)) return null;
  const intensity = log.band === 1 || log.band === 2 || log.band === 3 ? log.band : log.level;
  if (intensity !== 1 && intensity !== 2 && intensity !== 3) return null;
  const weekday = log.weekday;
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  const policy = log.policyVersion && POLICY_VERSION.test(log.policyVersion) ? log.policyVersion : null;
  return {
    event_id: log.interventionId,
    install_id: installId,
    created_at: log.timestamp,
    weekday,
    intensity,
    stage: knownStage(log.stage),
    method: knownMethod(log.method) ?? knownMethod(log.interventionType),
    commit_minutes: Math.max(0, Math.round(log.commitMinutes || 0)),
    card_correct: typeof log.cardCorrect === "boolean" ? log.cardCorrect : null,
    outcome: log.outcome,
    reentered_within_30min: typeof log.reenteredWithin30 === "boolean" ? log.reenteredWithin30 : null,
    policy_version: policy,
  };
}

export function toLockUpload(log: LockAttempt, installId: string): LockUpload | null {
  if (!isUuid(log.id) || !isUuid(installId)) return null;
  if (!isIso(log.createdAt)) return null;
  if (!Number.isFinite(log.remainingSec)) return null;
  return {
    event_id: log.id,
    install_id: installId,
    created_at: log.createdAt,
    remaining_sec: Math.max(0, Math.round(log.remainingSec)),
  };
}

function alreadyQueued(outbox: Outbox, eventId: string): boolean {
  return (
    outbox.sent.includes(eventId) ||
    outbox.sessions.some((row) => row.event_id === eventId) ||
    outbox.interventions.some((row) => row.event_id === eventId) ||
    outbox.locks.some((row) => row.event_id === eventId)
  );
}

/**
 * 로컬 저장이 끝난 뒤 호출한다. 동의가 꺼져 있으면 아무것도 쌓지 않는다.
 * 아직 열린 연습 세션은 끝나기 전에는 올리지 않는다.
 */
export function enqueueOps(
  outbox: Outbox,
  installId: string,
  ops: readonly EnqueueOp[],
  activeUsageId: string | null,
  enabled: boolean,
): Outbox {
  if (!enabled) return outbox;
  const next: Outbox = {
    ...outbox,
    sessions: [...outbox.sessions],
    interventions: [...outbox.interventions],
    locks: [...outbox.locks],
  };
  for (const op of ops) {
    if (op.kind === "session" && "row" in op) {
      const row = op.row as UsageLog;
      if (row.usageId === activeUsageId) continue;
      const payload = toSessionUpload(row, installId);
      if (!payload || alreadyQueued(next, payload.event_id)) continue;
      next.sessions.push(payload);
    } else if (op.kind === "intervention" && "row" in op) {
      const payload = toInterventionUpload(op.row as InterventionLog, installId);
      if (!payload || alreadyQueued(next, payload.event_id)) continue;
      next.interventions.push(payload);
    } else if (op.kind === "lock" && "row" in op) {
      const payload = toLockUpload(op.row as LockAttempt, installId);
      if (!payload || alreadyQueued(next, payload.event_id)) continue;
      next.locks.push(payload);
    }
  }
  return next;
}

export function outboxAfterReset(
  outbox: Outbox,
  options: { configured: boolean; deleteSucceeded: boolean },
): Outbox {
  const queued = [
    ...outbox.sent,
    ...outbox.deleteEventIds,
    ...outbox.sessions.map((row) => row.event_id),
    ...outbox.interventions.map((row) => row.event_id),
    ...outbox.locks.map((row) => row.event_id),
  ];
  if (!options.configured || options.deleteSucceeded) return emptyOutbox();
  return {
    sessions: [],
    interventions: [],
    locks: [],
    sent: [],
    pendingDelete: true,
    deleteEventIds: [...new Set(queued)],
  };
}

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isUuid);
}

function readSession(value: unknown): SessionUpload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<SessionUpload>;
  if (!isUuid(row.event_id) || !isUuid(row.install_id)) return null;
  if (row.target !== "youtube" && row.target !== "instagram" && row.target !== "practice") return null;
  if (row.source !== "native" && row.source !== "web") return null;
  if (typeof row.started_at !== "string" || typeof row.ended_at !== "string") return null;
  if (!isIso(row.started_at) || !isIso(row.ended_at)) return null;
  if (typeof row.duration_sec !== "number" || typeof row.clip_count !== "number") return null;
  return {
    event_id: row.event_id,
    install_id: row.install_id,
    target: row.target,
    source: row.source,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_sec: Math.max(0, row.duration_sec),
    clip_count: Math.max(0, Math.round(row.clip_count)),
  };
}

function readInterventionUpload(value: unknown): InterventionUpload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<InterventionUpload>;
  if (!isUuid(row.event_id) || !isUuid(row.install_id)) return null;
  if (typeof row.created_at !== "string" || !isIso(row.created_at)) return null;
  if (row.intensity !== 1 && row.intensity !== 2 && row.intensity !== 3) return null;
  if (typeof row.weekday !== "number" || row.weekday < 0 || row.weekday > 6) return null;
  if (typeof row.outcome !== "string" || !OUTCOMES.has(row.outcome)) return null;
  if (typeof row.commit_minutes !== "number") return null;
  return {
    event_id: row.event_id,
    install_id: row.install_id,
    created_at: row.created_at,
    weekday: row.weekday,
    intensity: row.intensity,
    stage: knownStage(row.stage),
    method: knownMethod(row.method),
    commit_minutes: Math.max(0, Math.round(row.commit_minutes)),
    card_correct: typeof row.card_correct === "boolean" ? row.card_correct : null,
    outcome: row.outcome,
    reentered_within_30min:
      typeof row.reentered_within_30min === "boolean" ? row.reentered_within_30min : null,
    policy_version:
      typeof row.policy_version === "string" && POLICY_VERSION.test(row.policy_version)
        ? row.policy_version
        : null,
  };
}

function readLock(value: unknown): LockUpload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<LockUpload>;
  if (!isUuid(row.event_id) || !isUuid(row.install_id)) return null;
  if (typeof row.created_at !== "string" || !isIso(row.created_at)) return null;
  if (typeof row.remaining_sec !== "number") return null;
  return {
    event_id: row.event_id,
    install_id: row.install_id,
    created_at: row.created_at,
    remaining_sec: Math.max(0, Math.round(row.remaining_sec)),
  };
}

export function normalizeOutbox(value: unknown): Outbox {
  if (!value || typeof value !== "object") return emptyOutbox();
  const raw = value as Partial<Outbox>;
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions.map(readSession).filter((row) => row !== null) : [],
    interventions: Array.isArray(raw.interventions)
      ? raw.interventions.map(readInterventionUpload).filter((row) => row !== null)
      : [],
    locks: Array.isArray(raw.locks) ? raw.locks.map(readLock).filter((row) => row !== null) : [],
    sent: idList(raw.sent),
    pendingDelete: raw.pendingDelete === true,
    deleteEventIds: idList(raw.deleteEventIds),
  };
}

type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number }>;

function restUrl(base: string, table: string, query = ""): string {
  return `${base.replace(/\/+$/, "")}/rest/v1/${table}${query}`;
}

function authHeaders(config: SyncConfig, installId: string, prefer: string): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json",
    Prefer: prefer,
    "x-install-id": installId,
  };
}

export async function deleteInstallRows(
  config: SyncConfig,
  installId: string,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  if (!isServerConfigured(config) || !isUuid(installId)) return false;
  const query = `?install_id=eq.${encodeURIComponent(installId)}`;
  try {
    for (const table of ["sessions", "interventions", "lock_attempts"]) {
      const response = await fetchImpl(restUrl(config.url, table, query), {
        method: "DELETE",
        headers: authHeaders(config, installId, "return=minimal"),
      });
      if (!response.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function postTable(
  config: SyncConfig,
  installId: string,
  table: string,
  rows: { event_id: string }[],
  fetchImpl: FetchLike,
): Promise<boolean> {
  if (rows.length === 0) return true;
  try {
    const response = await fetchImpl(restUrl(config.url, table, "?on_conflict=event_id"), {
      method: "POST",
      headers: authHeaders(config, installId, "resolution=ignore-duplicates,return=minimal"),
      body: JSON.stringify(rows),
    });
    return response.ok || response.status === 409;
  } catch {
    return false;
  }
}

function withoutIds<T extends { event_id: string }>(rows: T[], done: Set<string>): T[] {
  return rows.filter((row) => !done.has(row.event_id));
}

/**
 * 동의가 꺼져 있거나 서버 주소가 없으면 올리지 않는다.
 * 삭제가 남아 있으면 먼저 지우고, 실패하면 새 줄은 보내지 않는다.
 */
export async function flushOutbox(
  outbox: Outbox,
  args: { config: SyncConfig; installId: string; enabled: boolean; fetchImpl?: FetchLike },
): Promise<Outbox> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const configured = isServerConfigured(args.config);
  let next = outbox;
  if (next.pendingDelete) {
    if (!configured) return next;
    const deleted = await deleteInstallRows(args.config, args.installId, fetchImpl);
    if (!deleted) return next;
    next = { ...next, pendingDelete: false, deleteEventIds: [] };
  }
  if (!args.enabled || !configured) return next;
  const sent = new Set(next.sent);
  if (await postTable(args.config, args.installId, "sessions", next.sessions, fetchImpl)) {
    for (const row of next.sessions) sent.add(row.event_id);
    next = { ...next, sessions: [], sent: [...sent] };
  }
  if (await postTable(args.config, args.installId, "interventions", next.interventions, fetchImpl)) {
    for (const row of next.interventions) sent.add(row.event_id);
    next = { ...next, interventions: [], sent: [...sent] };
  }
  if (await postTable(args.config, args.installId, "lock_attempts", next.locks, fetchImpl)) {
    for (const row of next.locks) sent.add(row.event_id);
    next = { ...next, locks: [], sent: [...sent] };
  }
  next = {
    ...next,
    sessions: withoutIds(next.sessions, sent),
    interventions: withoutIds(next.interventions, sent),
    locks: withoutIds(next.locks, sent),
  };
  return next;
}
