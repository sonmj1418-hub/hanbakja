import { isNativeAndroid } from "./guard.ts";
import { bakedSyncConfig } from "./sync-config.ts";
import {
  deleteInstallRows,
  emptyOutbox,
  enqueueOps,
  flushOutbox,
  isServerConfigured,
  normalizeOutbox,
  outboxAfterReset,
  type Outbox,
} from "./usage-sync.ts";

/** 설치 id와 업로드 대기열. 기록 초기화 뒤에도 남는다. 화면에 보이는 기록은 SQLite다. */
const INSTALL_KEY = "hanbakja.install_id";
const OUTBOX_KEY = "hanbakja.usage-outbox";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SyncSnapshot = { installId: string; outbox: Outbox };

type RawSync = { installId: string | null; outbox: unknown };

let chain: Promise<void> = Promise.resolve();

/** 저장 직후 업로드와 주기 재시도가 대기열을 동시에 고치지 않게 한다. */
export function runSync<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function parseInstallId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (UUID.test(trimmed)) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === "string" && UUID.test(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readRaw(): Promise<RawSync> {
  if (isNativeAndroid()) {
    const db = await import("./db.ts");
    return db.readSyncState();
  }
  if (typeof localStorage === "undefined") return { installId: null, outbox: null };
  const installRaw = localStorage.getItem(INSTALL_KEY);
  const outboxRaw = localStorage.getItem(OUTBOX_KEY);
  let outbox: unknown = null;
  if (outboxRaw) {
    try {
      outbox = JSON.parse(outboxRaw) as unknown;
    } catch {
      outbox = null;
    }
  }
  return { installId: parseInstallId(installRaw), outbox };
}

async function writeRaw(installId: string, outbox: Outbox): Promise<void> {
  if (isNativeAndroid()) {
    const db = await import("./db.ts");
    await db.writeSyncState(installId, outbox);
    return;
  }
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(INSTALL_KEY, installId);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

export async function loadSyncState(): Promise<SyncSnapshot | null> {
  try {
    const raw = await readRaw();
    const installId = parseInstallId(raw.installId) ?? crypto.randomUUID();
    const outbox = normalizeOutbox(raw.outbox);
    if (!parseInstallId(raw.installId)) await writeRaw(installId, outbox);
    return { installId, outbox };
  } catch {
    return null;
  }
}

export async function saveSyncState(state: SyncSnapshot): Promise<void> {
  await writeRaw(state.installId, state.outbox);
}

type SyncOp =
  | { kind: "session"; row: import("./types.ts").UsageLog }
  | { kind: "intervention"; row: import("./types.ts").InterventionLog }
  | { kind: "lock"; row: import("./types.ts").LockAttempt }
  | { kind: string };

/** 로컬 저장이 성공한 뒤에만 호출한다. 실패해도 앱 저장은 그대로 둔다. */
export async function syncPending(input: {
  ops?: readonly SyncOp[];
  enabled: boolean;
  activeUsageId: string | null;
}): Promise<void> {
  const state = await loadSyncState();
  if (!state) return;
  const queued = input.ops
    ? enqueueOps(state.outbox, state.installId, input.ops, input.activeUsageId, input.enabled)
    : state.outbox;
  const queuedJson = JSON.stringify(queued);
  if (queuedJson !== JSON.stringify(state.outbox)) {
    await saveSyncState({ installId: state.installId, outbox: queued });
  }
  const hasUpload =
    input.enabled && (queued.sessions.length > 0 || queued.interventions.length > 0 || queued.locks.length > 0);
  if (!hasUpload && !queued.pendingDelete) return;
  const flushed = await flushOutbox(queued, {
    config: bakedSyncConfig(),
    installId: state.installId,
    enabled: input.enabled,
  });
  if (JSON.stringify(flushed) !== queuedJson) {
    await saveSyncState({ installId: state.installId, outbox: flushed });
  }
}

/** 이 설치의 서버 줄을 지운다. 실패하면 대기열에 삭제를 남긴다. 로컬 기록은 여기서 지우지 않는다. */
export async function resetUsageSync(): Promise<void> {
  const state = await loadSyncState();
  if (!state) return;
  const config = bakedSyncConfig();
  const configured = isServerConfigured(config);
  const deleteSucceeded = configured ? await deleteInstallRows(config, state.installId) : true;
  const outbox = outboxAfterReset(state.outbox, { configured, deleteSucceeded });
  await saveSyncState({ installId: state.installId, outbox });
}

export function freshOutbox(): Outbox {
  return emptyOutbox();
}
