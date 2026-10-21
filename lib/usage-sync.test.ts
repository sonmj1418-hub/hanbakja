import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bakedSyncConfig, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./sync-config.ts";
import { readIntervention } from "./storage.ts";
import type { InterventionLog, LockAttempt, UsageLog } from "./types.ts";
import {
  emptyOutbox,
  enqueueOps,
  flushOutbox,
  isServerConfigured,
  outboxAfterReset,
  toInterventionUpload,
  type Outbox,
} from "./usage-sync.ts";

const INSTALL = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const INTERVENTION_ID = "33333333-3333-4333-8333-333333333333";
const LOCK_ID = "44444444-4444-4444-8444-444444444444";
const config = { url: "https://example.supabase.co", anonKey: "test-publishable" };

function session(id = SESSION_ID): UsageLog {
  return {
    usageId: id,
    date: "2026-10-21",
    startTime: "2026-10-21T01:00:00.000Z",
    endTime: "2026-10-21T01:05:00.000Z",
    duration: 300,
    clipCount: 4,
    target: "youtube",
    source: "native",
  };
}

function intervention(): InterventionLog {
  const row = readIntervention({
    interventionId: INTERVENTION_ID,
    timestamp: "2026-10-21T01:02:00.000Z",
    date: "2026-10-21",
    level: 2,
    reason: "비밀이유-올리면안됨",
    reasonNote: "자유메모-올리면안됨",
    hour: 10,
    weekday: 3,
    target: "youtube",
    interventionType: "breath",
    alternativeAction: "산책 문장-올리면안됨",
    alternativeCompleted: true,
    outcome: "exit",
    reEntered: false,
    blocked: false,
    blockDuration: 10,
    usageSeconds: 80,
    reenteredWithin30: false,
    feedback: "not",
    band: 2,
    stage: "entry",
    framing: "shorts",
    verification: "verified",
    reflection: "성찰문장-올리면안됨",
    afterLock: "잠금뒤문장-올리면안됨",
    commitMinutes: 5,
    cardId: "card-내용-올리면안됨",
    cardCorrect: true,
    extensionIndex: 1,
    policyVersion: "ai-1",
    method: "breath",
  });
  assert.ok(row);
  return row;
}

function lock(): LockAttempt {
  return {
    id: LOCK_ID,
    createdAt: "2026-10-21T01:03:00.000Z",
    date: "2026-10-21",
    remainingSec: 90,
    target: "instagram",
  };
}

type Call = { url: string; method: string; body: unknown; installId: string | null };

function fakeFetch(calls: Call[], status = 201) {
  return async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(init.body) : null,
      installId: init?.headers?.["x-install-id"] ?? null,
    });
    return { ok: status >= 200 && status < 300, status };
  };
}

describe("usage sync", () => {
  it("switch off uploads nothing", async () => {
    const seeded: Outbox = {
      ...emptyOutbox(),
      sessions: [
        {
          event_id: SESSION_ID,
          install_id: INSTALL,
          target: "youtube",
          source: "native",
          started_at: "2026-10-21T01:00:00.000Z",
          ended_at: "2026-10-21T01:05:00.000Z",
          duration_sec: 300,
          clip_count: 4,
        },
      ],
    };
    const calls: Call[] = [];
    const kept = enqueueOps(seeded, INSTALL, [{ kind: "session", row: session() }], null, false);
    assert.equal(kept.sessions.length, 1);
    const flushed = await flushOutbox(kept, {
      config,
      installId: INSTALL,
      enabled: false,
      fetchImpl: fakeFetch(calls),
    });
    assert.equal(calls.length, 0);
    assert.equal(flushed.sessions.length, 1);
    assert.equal(isServerConfigured({ url: "", anonKey: "present" }), false);
    const unconfigured = await flushOutbox(seeded, {
      config: { url: "", anonKey: "" },
      installId: INSTALL,
      enabled: true,
      fetchImpl: fakeFetch(calls),
    });
    assert.equal(calls.length, 0);
    assert.equal(unconfigured.sessions.length, 1);
  });

  it("switch on sends only the allowed fields", async () => {
    const calls: Call[] = [];
    const outbox = enqueueOps(
      emptyOutbox(),
      INSTALL,
      [
        { kind: "session", row: session() },
        { kind: "intervention", row: intervention() },
        { kind: "lock", row: lock() },
        { kind: "settings" },
        { kind: "card" },
      ],
      null,
      true,
    );
    const flushed = await flushOutbox(outbox, {
      config,
      installId: INSTALL,
      enabled: true,
      fetchImpl: fakeFetch(calls),
    });
    assert.equal(flushed.sessions.length, 0);
    assert.equal(flushed.sent.length, 3);
    const posts = calls.filter((call) => call.method === "POST");
    assert.equal(posts.length, 3);
    const sessionBody = posts.find((call) => call.url.endsWith("/sessions?on_conflict=event_id"))?.body as Record<string, unknown>[];
    const interventionBody = posts.find((call) => call.url.includes("/interventions?"))?.body as Record<string, unknown>[];
    const lockBody = posts.find((call) => call.url.includes("/lock_attempts?"))?.body as Record<string, unknown>[];
    assert.deepEqual(Object.keys(sessionBody[0]).sort(), [
      "clip_count",
      "duration_sec",
      "ended_at",
      "event_id",
      "install_id",
      "source",
      "started_at",
      "target",
    ]);
    assert.deepEqual(Object.keys(interventionBody[0]).sort(), [
      "card_correct",
      "commit_minutes",
      "created_at",
      "event_id",
      "install_id",
      "intensity",
      "method",
      "outcome",
      "policy_version",
      "reentered_within_30min",
      "stage",
      "weekday",
    ]);
    assert.deepEqual(Object.keys(lockBody[0]).sort(), ["created_at", "event_id", "install_id", "remaining_sec"]);
    assert.equal(lockBody[0].remaining_sec, 90);
    assert.equal("target" in lockBody[0], false);
    const packed = JSON.stringify(posts.map((call) => call.body));
    for (const hidden of ["비밀이유", "자유메모", "성찰문장", "잠금뒤문장", "산책 문장", "card-내용", "interestTopic"]) {
      assert.equal(packed.includes(hidden), false, hidden);
    }
    assert.equal(interventionBody[0].card_correct, true);
    assert.equal(interventionBody[0].method, "breath");
    assert.equal(interventionBody[0].intensity, 2);
    assert.equal(posts.every((call) => call.installId === INSTALL), true);
  });

  it("duplicate event_id is not sent twice", async () => {
    const calls: Call[] = [];
    const once = enqueueOps(emptyOutbox(), INSTALL, [{ kind: "session", row: session() }], null, true);
    const twice = enqueueOps(once, INSTALL, [{ kind: "session", row: session() }], null, true);
    assert.equal(twice.sessions.length, 1);
    const flushed = await flushOutbox(twice, {
      config,
      installId: INSTALL,
      enabled: true,
      fetchImpl: fakeFetch(calls),
    });
    assert.equal(calls.length, 1);
    assert.equal((calls[0].body as unknown[]).length, 1);
    await flushOutbox(flushed, {
      config,
      installId: INSTALL,
      enabled: true,
      fetchImpl: fakeFetch(calls),
    });
    assert.equal(calls.length, 1);
    const again = enqueueOps(flushed, INSTALL, [{ kind: "session", row: session() }], null, true);
    assert.equal(again.sessions.length, 0);
    const open = enqueueOps(emptyOutbox(), INSTALL, [{ kind: "session", row: session() }], SESSION_ID, true);
    assert.equal(open.sessions.length, 0);
    const waiting = readIntervention({ ...intervention(), reenteredWithin30: null, outcome: "exit" });
    assert.ok(waiting);
    assert.equal(toInterventionUpload(waiting, INSTALL), null);
  });

  it("reset clears the local outbox", () => {
    const filled: Outbox = {
      sessions: [
        {
          event_id: SESSION_ID,
          install_id: INSTALL,
          target: "youtube",
          source: "native",
          started_at: "2026-10-21T01:00:00.000Z",
          ended_at: "2026-10-21T01:05:00.000Z",
          duration_sec: 300,
          clip_count: 4,
        },
      ],
      interventions: [],
      locks: [],
      sent: [INTERVENTION_ID],
      pendingDelete: false,
      deleteEventIds: [],
    };
    assert.deepEqual(outboxAfterReset(filled, { configured: true, deleteSucceeded: true }), emptyOutbox());
    const queued = outboxAfterReset(filled, { configured: true, deleteSucceeded: false });
    assert.deepEqual(queued.sessions, []);
    assert.deepEqual(queued.interventions, []);
    assert.deepEqual(queued.locks, []);
    assert.equal(queued.pendingDelete, true);
    assert.deepEqual(queued.deleteEventIds, [INTERVENTION_ID, SESSION_ID]);
    assert.deepEqual(outboxAfterReset(filled, { configured: false, deleteSucceeded: false }), emptyOutbox());
  });

  it("bakes the shared project and does not ship a secret key", () => {
    assert.equal(SUPABASE_URL, "https://zpmkgmqqdrtuefqejtbm.supabase.co");
    assert.equal(SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"), true);
    assert.equal(SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret"), false);
    assert.equal(SUPABASE_PUBLISHABLE_KEY.includes("service_role"), false);
    assert.equal(isServerConfigured(bakedSyncConfig()), true);
    const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
    assert.equal(sql.includes("sb_publishable_"), false);
    assert.equal(sql.includes("sb_secret_"), false);
    assert.equal(/grant select[^;]*\bto anon\b/i.test(sql), false);
    assert.equal(sql.includes("for select"), false);
    assert.equal(sql.includes("grant insert, delete on table public.sessions to anon, authenticated"), true);
    assert.equal(sql.includes("sessions_delete_own"), true);
    assert.equal(sql.includes("usage_install_id"), true);
  });
});
