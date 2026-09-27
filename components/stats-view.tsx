"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/components/store";
import { useNow } from "@/components/use-now";
import {
  formatClock,
  formatKoreanDate,
  formatShortDate,
  formatTime,
  lastDates,
  OUTCOME_LABEL,
  reasonLabel,
  statsForDate,
  todayKey,
  usageSecondsOn,
} from "@/lib/logic";
import { cn } from "@/lib/utils";

export function StatsView() {
  const { data } = useStore();
  const now = useNow(5000);
  const today = todayKey(new Date(now));
  const [selected, setSelected] = useState(today);
  if (!data) return null;

  const days = lastDates(7, new Date(now));
  const active = days.includes(selected) ? selected : today;
  const series = days.map((date) => ({
    date,
    seconds: usageSecondsOn(data, date),
  }));
  const max = Math.max(...series.map((item) => item.seconds), 1);
  const stats = statsForDate(data, active);
  const interventions = data.interventions
    .filter((log) => log.date === active)
    .slice()
    .reverse();
  const sessions = data.usageLogs
    .filter((log) => log.date === active)
    .slice()
    .reverse();
  const empty = interventions.length === 0 && sessions.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">일별 사용과 개입</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">통계</h1>
      </header>

      <section aria-label="최근 7일 사용 시간">
        <div className="grid grid-cols-7 gap-2">
          {series.map((item) => {
            const height = Math.max(8, Math.round((item.seconds / max) * 96));
            const on = item.date === active;
            return (
              <button
                key={item.date}
                type="button"
                onClick={() => setSelected(item.date)}
                aria-pressed={on}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl px-1 py-2",
                  on ? "bg-secondary" : "hover:bg-secondary/60",
                )}
              >
                <span className="flex h-28 items-end">
                  <span
                    className={cn(
                      "w-3 rounded-full",
                      item.seconds > 0 ? "bg-primary" : "bg-muted",
                    )}
                    style={{ height }}
                  />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatShortDate(item.date, today)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div>
        <h2 className="text-lg font-semibold">{formatKoreanDate(active)}</h2>
        {empty ? (
          <Card className="mt-3">
            <CardContent className="py-8 text-sm leading-6 text-muted-foreground">
              이 날의 기록이 없습니다. 쇼츠를 열면 사용 시간, 실행 이유, 레벨,
              대체행동, 재실행 여부가 여기에 쌓입니다.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="사용 시간" value={formatClock(stats.usageSeconds)} />
            <Metric label="실행" value={`${stats.clipCount}회`} />
            <Metric label="개입" value={`${stats.interventionCount}회`} />
            <Metric label="많은 이유" value={stats.topReason ?? "없음"} />
            <Metric label="Level 1" value={`${stats.levelCounts[1]}회`} />
            <Metric label="Level 2" value={`${stats.levelCounts[2]}회`} />
            <Metric label="Level 3" value={`${stats.levelCounts[3]}회`} />
            <Metric label="대체행동 후 재실행" value={`${stats.reentryCount}회`} />
            <Metric label="시간 차단" value={`${stats.blockCount}회`} />
            <Metric label="강제 종료" value={`${stats.forceQuitCount}회`} />
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">개입 기록</h2>
        {interventions.length === 0 ? (
          <p className="text-sm text-muted-foreground">이 날의 개입이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {interventions.map((log) => (
              <li key={log.interventionId}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>
                        {formatTime(log.timestamp)} · Level {log.level}
                      </span>
                      <Badge variant="outline">{OUTCOME_LABEL[log.outcome]}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <Field label="실행 이유" value={reasonLabel(log)} />
                      <Field label="당시 누적" value={formatClock(log.usageSeconds)} />
                      <Field label="대체행동" value={log.alternativeAction ?? "없음"} />
                      <Field
                        label="수행 여부"
                        value={log.alternativeCompleted ? "수행함" : "하지 않음"}
                      />
                      <Field label="재실행" value={log.reEntered ? "다시 봄" : "보지 않음"} />
                      <Field label="차단 여부" value={log.blocked ? "차단함" : "차단 안 함"} />
                      <Field
                        label="차단 시간"
                        value={
                          log.blockDuration > 0
                            ? log.blockDuration === 60
                              ? "1시간"
                              : `${log.blockDuration}분`
                            : "없음"
                        }
                      />
                    </dl>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">사용 기록</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">이 날의 시청 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((log) => (
              <li
                key={log.usageId}
                className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10"
              >
                <span className="tabular-nums">
                  {formatTime(log.startTime)} – {formatTime(log.endTime)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatClock(log.duration)} · {log.clipCount}회
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
