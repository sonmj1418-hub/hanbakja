"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardPanel } from "@/components/guard-panel";
import { useStore } from "@/components/store";
import { useNow } from "@/components/use-now";
import {
  blockRemainingSeconds,
  formatClock,
  formatTime,
  isBlocked,
  isReportDue,
  LEVEL_SUMMARY,
  levelForUsage,
  nextLevelGap,
  OUTCOME_LABEL,
  reasonLabel,
  statsForDate,
  todayKey,
  usageSecondsOn,
} from "@/lib/logic";

export function HomeView() {
  const router = useRouter();
  const { data } = useStore();
  const now = useNow();
  if (!data) return null;

  const today = todayKey(new Date(now));
  const seconds = usageSecondsOn(data, today);
  const level = levelForUsage(seconds, data.settings);
  const stats = statsForDate(data, today);
  const gap = nextLevelGap(seconds, data.settings);
  const blocked = isBlocked(data.block, now);
  const remaining = blockRemainingSeconds(data.block, now);
  const reportReady = isReportDue(data.settings.notificationTime, new Date(now));
  const recent = data.interventions
    .filter((log) => log.date === today)
    .slice()
    .reverse()
    .slice(0, 3);
  const l1 = data.settings.level1Threshold;
  const l3 = data.settings.level3Threshold;
  const scaleMax = l3 * 1.35;
  const marker = Math.min(100, (seconds / 60 / scaleMax) * 100);
  const l1Width = (l1 / scaleMax) * 100;
  const l2Width = ((l3 - l1) / scaleMax) * 100;
  const l3Width = 100 - l1Width - l2Width;

  function openShorts() {
    router.push("/watch");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">YouTube Shorts · Instagram Reels</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Focus on</h1>
        </div>
        <Badge variant={level === 3 ? "destructive" : "secondary"}>
          Level {level}
        </Badge>
      </header>

      <GuardPanel />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
        <Card className="gap-5">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              오늘 누적
            </CardTitle>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">
              {formatClock(seconds)}
            </p>
            <p className="text-sm text-muted-foreground">{LEVEL_SUMMARY[level]}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="relative h-3 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`오늘 사용 ${formatClock(seconds)}. Level 2는 ${l1}분, Level 3는 ${l3}분부터입니다.`}
            >
              <div className="absolute inset-0 flex">
                <div className="h-full bg-level-1/80" style={{ width: `${l1Width}%` }} />
                <div className="h-full bg-level-2/85" style={{ width: `${l2Width}%` }} />
                <div className="h-full bg-level-3/85" style={{ width: `${l3Width}%` }} />
              </div>
              <div
                className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
                style={{ left: `clamp(0px, calc(${marker}% - 8px), calc(100% - 16px))` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>0분</span>
              <span>L2 {l1}분</span>
              <span>L3 {l3}분</span>
            </div>
            <p className="text-sm">
              {gap
                ? `${gap.label} ${formatClock(gap.remainSeconds)} 남았습니다.`
                : "오늘은 Level 3 구간입니다. 다음에 열면 경고와 차단이 나옵니다."}
            </p>
            {blocked ? (
              <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm">
                <p className="font-medium text-destructive">쇼츠 열기가 차단되어 있습니다</p>
                <p className="mt-1 tabular-nums text-foreground">
                  남은 시간 {formatClock(remaining)}
                </p>
              </div>
            ) : null}
            <Button
              type="button"
              className="h-12 w-full text-base"
              onClick={openShorts}
            >
              {blocked ? "차단 상태 보기" : "쇼츠 열기"}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              이 버튼은 연습입니다. 안드로이드에서 접근성을 켜면 실제 YouTube
              Shorts와 Instagram Reels 화면에서 같은 개입이 열립니다.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Card size="sm">
            <CardHeader>
              <CardTitle>오늘의 개입</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <Stat label="실행" value={`${stats.clipCount}회`} />
              <Stat label="개입" value={`${stats.interventionCount}회`} />
              <Stat label="차단" value={`${stats.blockCount}회`} />
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>일일 리포트</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                {reportReady
                  ? "오늘의 리포트를 볼 수 있습니다."
                  : `${data.settings.notificationTime}에 하루를 정리합니다.`}
              </p>
              <Button variant="outline" className="h-10" onClick={() => router.push("/report")}>
                리포트 열기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">최근 개입</h2>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm leading-6 text-muted-foreground">
              아직 오늘 쇼츠를 열지 않았습니다. 열면 이유와 레벨, 그다음 선택이
              여기에 남습니다.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {recent.map((log) => (
              <li
                key={log.interventionId}
                className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">
                    Level {log.level} · {reasonLabel(log)}
                  </p>
                  <time className="text-xs text-muted-foreground tabular-nums" dateTime={log.timestamp}>
                    {formatTime(log.timestamp)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {OUTCOME_LABEL[log.outcome]}
                  {log.alternativeAction ? ` · ${log.alternativeAction}` : ""}
                  {log.alternativeCompleted ? " · 수행함" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
