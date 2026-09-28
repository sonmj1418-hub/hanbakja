"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { GuardPanel } from "@/components/guard-panel";
import { useStore } from "@/components/store";
import { normalizeClock, validateSettings } from "@/lib/logic";
import type { Settings } from "@/lib/types";

type Draft = {
  level1: string;
  level3: string;
  notificationTime: string;
  timeScale: 1 | 30 | 60;
  notifyEnabled: boolean;
};

function toDraft(settings: Settings): Draft {
  return {
    level1: String(settings.level1Threshold),
    level3: String(settings.level3Threshold),
    notificationTime: settings.notificationTime,
    timeScale: settings.timeScale,
    notifyEnabled: settings.notifyEnabled,
  };
}

export function SettingsView() {
  const {
    data,
    permission,
    saveSettings,
    reset,
    requestNotificationPermission,
    previewNotification,
  } = useStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!data) return null;
  const form = draft ?? toDraft(data.settings);

  function update(partial: Partial<Draft>) {
    setDraft({ ...form, ...partial });
    setSaved(false);
    setError(null);
  }

  function save() {
    const level1Threshold = Number(form.level1);
    const level3Threshold = Number(form.level3);
    const notificationTime = normalizeClock(form.notificationTime);
    const message = validateSettings({
      level1Threshold,
      level3Threshold,
      notificationTime: notificationTime ?? form.notificationTime,
      timeScale: form.timeScale,
    });
    if (message || !notificationTime) {
      setError(message ?? "알림 시각을 다시 확인해 주세요.");
      setSaved(false);
      return;
    }
    saveSettings({
      level1Threshold,
      level2Threshold: level3Threshold,
      level3Threshold,
      notificationTime,
      timeScale: form.timeScale,
      notifyEnabled: form.notifyEnabled,
    });
    setError(null);
    setSaved(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">기준, 알림, 시연</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">설정</h1>
      </header>

      <GuardPanel />

      <form
        className="space-y-5 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="level1">Level 2가 시작되는 누적 시간 (분)</Label>
          <Input
            id="level1"
            inputMode="numeric"
            value={form.level1}
            onChange={(event) => update({ level1: event.target.value })}
            aria-invalid={Boolean(error)}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            이 시간 미만이면 Level 1입니다. 질문을 고른 뒤 5초를 기다립니다.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="level3">Level 3가 시작되는 누적 시간 (분)</Label>
          <Input
            id="level3"
            inputMode="numeric"
            value={form.level3}
            onChange={(event) => update({ level3: event.target.value })}
            aria-invalid={Boolean(error)}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            그 사이는 Level 2로 대체행동을 제안하고, 이 시간부터는 경고와 차단입니다.
            기본값은 10분, 20분입니다.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notify-time">일일 리포트 시각</Label>
          <Input
            id="notify-time"
            type="time"
            value={form.notificationTime}
            onChange={(event) => update({ notificationTime: event.target.value })}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            이 기기 시각 기준입니다. 앱이 열려 있을 때 브라우저 알림을 보내고, 리포트
            화면에도 같은 내용을 표시합니다.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="notify-enabled">브라우저 알림</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              끄면 예약 알림을 보내지 않습니다. 리포트 화면은 유지됩니다.
            </p>
          </div>
          <Switch
            id="notify-enabled"
            checked={form.notifyEnabled}
            onCheckedChange={(checked) => update({ notifyEnabled: checked })}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">시간 가속</legend>
          <div className="grid grid-cols-3 gap-2">
            {([1, 30, 60] as const).map((scale) => (
              <Button
                key={scale}
                type="button"
                variant={form.timeScale === scale ? "default" : "outline"}
                className="h-11"
                aria-pressed={form.timeScale === scale}
                onClick={() => update({ timeScale: scale })}
              >
                {scale === 1 ? "실제 1배" : `${scale}배`}
              </Button>
            ))}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            시연용입니다. 60배에서는 실제 1초가 사용 시간 1분으로 쌓이고, 10분 차단은
            실제 10초입니다.
          </p>
        </fieldset>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm text-muted-foreground" role="status">
            설정을 저장했습니다.
          </p>
        ) : null}
        <Button type="submit" className="h-11 w-full">
          저장
        </Button>
      </form>

      <section className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="text-base font-medium">알림 권한</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {permission === "granted"
            ? "이 브라우저에서 알림을 보낼 수 있습니다."
            : permission === "denied"
              ? "알림이 차단되어 있습니다. 주소창의 사이트 설정에서 허용해 주세요."
              : permission === "unsupported"
                ? "이 브라우저는 알림 API를 제공하지 않습니다."
                : "아직 권한을 묻지 않았습니다."}
        </p>
        {permissionMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {permissionMessage}
          </p>
        ) : null}
        {notice ? (
          <p className="text-sm" role="status">
            {notice}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => {
              void requestNotificationPermission().then((message) => {
                setPermissionMessage(message);
                setNotice(message ? null : "알림을 허용했습니다.");
              });
            }}
          >
            알림 허용 요청
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => {
              const message = previewNotification();
              setPermissionMessage(message);
              setNotice(message ? null : "알림을 보냈습니다.");
            }}
          >
            알림 미리보기
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-base font-medium">기록 초기화</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          이 브라우저에 저장된 사용 시간, 개입, 차단을 지웁니다. 설정은 기본값으로
          돌아갑니다.
        </p>
        {confirmReset ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              onClick={() => {
                reset();
                setDraft(null);
                setConfirmReset(false);
                setSaved(false);
              }}
            >
              정말 지우기
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setConfirmReset(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setConfirmReset(true)}
          >
            기록 모두 지우기
          </Button>
        )}
      </section>

      <section className="space-y-2 text-sm leading-6 text-muted-foreground">
        <h2 className="text-base font-medium text-foreground">폰에 설치</h2>
        <p>
          아이폰은 Safari에서 이 페이지를 연 뒤 공유 버튼을 누르고{" "}
          <strong className="font-medium text-foreground">홈 화면에 추가</strong>를
          고르세요. 한 번 열린 뒤에는 네트워크가 없어도 홈 화면 아이콘으로 열립니다.
        </p>
        <p>
          안드로이드는{" "}
          <a
            className="underline"
            href="https://github.com/sonmj1418-hub/hanbakja/releases/download/v0.3.0/hanbakja-debug.apk"
          >
            한박자 APK
          </a>
          를 받아 설치하세요. 출처를 알 수 없는 앱 설치를 허용해야 합니다. 설치 후
          설정 → 접근성에서 한박자를 켜야 실제 쇼츠와 릴스에 개입합니다.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-6 text-muted-foreground">
        <h2 className="text-base font-medium text-foreground">이 앱이 하지 않는 일</h2>
        <p>
          브라우저와 아이폰에서는 다른 앱을 막지 않습니다. 안드로이드 설치본은
          접근성을 켠 뒤에 YouTube Shorts와 Instagram Reels 화면만 구분합니다.
          그 화면의 글이나 다른 앱의 내용은 저장하지 않고, 프로세스를 강제로
          종료하지도 않습니다. 나가거나 차단하면 뒤로 이동해 한박자로 돌아옵니다.
        </p>
      </section>
    </div>
  );
}
