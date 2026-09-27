import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyFlush,
  blockUntilFromMinutes,
  finalizeSession,
  isBlocked,
  isReportDue,
  levelForUsage,
  reportLines,
  statsForDate,
  validateSettings,
} from "./logic.ts";
import { defaultData, defaultSettings, normalizeData } from "./storage.ts";
import type { AppData } from "./types.ts";

const settings = defaultSettings();

describe("level", () => {
  it("follows the 10 and 20 minute bands", () => {
    assert.equal(levelForUsage(0, settings), 1);
    assert.equal(levelForUsage(9.9 * 60, settings), 1);
    assert.equal(levelForUsage(10 * 60, settings), 2);
    assert.equal(levelForUsage(19.9 * 60, settings), 2);
    assert.equal(levelForUsage(20 * 60, settings), 3);
  });
});

describe("settings", () => {
  it("rejects an inverted threshold", () => {
    const message = validateSettings({
      level1Threshold: 20,
      level3Threshold: 10,
      notificationTime: "21:00",
      timeScale: 1,
    });
    assert.ok(message);
  });

  it("accepts a clock with seconds", () => {
    assert.equal(
      validateSettings({
        level1Threshold: 1,
        level3Threshold: 2,
        notificationTime: "09:30:00",
        timeScale: 60,
      }),
      null,
    );
  });
});

describe("usage flush", () => {
  it("adds scaled time only while visible", () => {
    const start = 1_000;
    const data: AppData = {
      ...defaultData(),
      settings: { ...settings, timeScale: 60 },
      activeSession: {
        usageId: "u1",
        date: "2026-09-27",
        startTime: new Date(start).toISOString(),
        duration: 0,
        clipCount: 1,
        interventionId: "i1",
        levelAtStart: 1,
        lastTickAt: start,
      },
      usageLogs: [
        {
          usageId: "u1",
          date: "2026-09-27",
          startTime: new Date(start).toISOString(),
          endTime: new Date(start).toISOString(),
          duration: 0,
          clipCount: 1,
        },
      ],
    };
    const hidden = applyFlush(data, false, start + 500);
    assert.equal(hidden.activeSession?.duration, 0);
    const visible = applyFlush(hidden, true, start + 1500);
    assert.equal(visible.activeSession?.duration, 60);
    const done = finalizeSession(visible, start + 1500);
    assert.equal(done.activeSession, null);
    assert.equal(done.usageLogs[0]?.duration, 60);
  });
});

describe("block and report", () => {
  it("shortens a block when time is scaled", () => {
    const now = Date.parse("2026-09-27T12:00:00");
    const until = blockUntilFromMinutes(10, 60, now);
    assert.equal(Date.parse(until) - now, 10_000);
    assert.equal(isBlocked({ until, minutes: 10 }, now + 9_000), true);
    assert.equal(isBlocked({ until, minutes: 10 }, now + 11_000), false);
  });

  it("treats the report as due at the configured minute", () => {
    const morning = new Date(2026, 8, 27, 8, 0, 0);
    const evening = new Date(2026, 8, 27, 21, 0, 0);
    assert.equal(isReportDue("21:00", morning), false);
    assert.equal(isReportDue("21:00", evening), true);
  });
});

describe("stats", () => {
  it("counts clips, reasons, reentry, and timed blocks separately", () => {
    const data = defaultData();
    data.usageLogs.push({
      usageId: "u",
      date: "2026-09-27",
      startTime: "2026-09-27T01:00:00.000Z",
      endTime: "2026-09-27T01:02:00.000Z",
      duration: 120,
      clipCount: 4,
    });
    data.interventions.push(
      {
        interventionId: "a",
        timestamp: "2026-09-27T01:00:00.000Z",
        date: "2026-09-27",
        level: 2,
        reason: "습관적으로",
        reasonNote: "",
        alternativeAction: "호흡하기",
        alternativeCompleted: true,
        reEntered: true,
        blocked: false,
        blockDuration: 0,
        usageSeconds: 60,
        outcome: "watch",
      },
      {
        interventionId: "a2",
        timestamp: "2026-09-27T01:01:00.000Z",
        date: "2026-09-27",
        level: 1,
        reason: "습관적으로",
        reasonNote: "",
        alternativeAction: null,
        alternativeCompleted: false,
        reEntered: true,
        blocked: false,
        blockDuration: 0,
        usageSeconds: 30,
        outcome: "watch",
      },
      {
        interventionId: "b",
        timestamp: "2026-09-27T01:05:00.000Z",
        date: "2026-09-27",
        level: 3,
        reason: "심심해서",
        reasonNote: "",
        alternativeAction: null,
        alternativeCompleted: false,
        reEntered: false,
        blocked: true,
        blockDuration: 10,
        usageSeconds: 1200,
        outcome: "timed-block",
      },
      {
        interventionId: "c",
        timestamp: "2026-09-27T01:06:00.000Z",
        date: "2026-09-27",
        level: 3,
        reason: "차단 중 다시 열기",
        reasonNote: "",
        alternativeAction: null,
        alternativeCompleted: false,
        reEntered: false,
        blocked: true,
        blockDuration: 10,
        usageSeconds: 1200,
        outcome: "blocked-retry",
      },
    );
    const stats = statsForDate(data, "2026-09-27");
    assert.equal(stats.clipCount, 4);
    assert.equal(stats.interventionCount, 4);
    assert.equal(stats.topReason, "습관적으로");
    assert.equal(stats.reentryCount, 1);
    assert.equal(stats.blockCount, 1);
    assert.match(reportLines(stats).join("\n"), /대체행동 후 재실행 : 1회/);
  });
});

describe("storage", () => {
  it("rejects a broken document", () => {
    assert.equal(normalizeData({ usageLogs: "nope" }), null);
  });
});
