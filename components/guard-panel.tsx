"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HanbakjaGuard, isNativeAndroid } from "@/lib/guard";

export function GuardPanel() {
  const [native, setNative] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [blocker, setBlocker] = useState<boolean | null>(null);

  useEffect(() => {
    const onAndroid = isNativeAndroid();
    setNative(onAndroid);
    let stopped = false;

    async function read() {
      try {
        const status = await HanbakjaGuard.getStatus();
        if (stopped) return;
        setBlocker(status.blockerEnabled);
        if (onAndroid) setEnabled(status.enabled);
      } catch {
        if (stopped) return;
        setBlocker(true);
        if (onAndroid) setEnabled(false);
      }
    }

    void read();
    const id = window.setInterval(() => void read(), 2000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void read();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const blockerOn = blocker !== false;

  return (
    <section className="space-y-3 rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="blocker-enabled" className="text-base font-medium">
            쇼츠·릴스 개입
          </Label>
          <p className="text-sm leading-6 text-muted-foreground">
            {blocker === null
              ? "개입 스위치를 확인하고 있습니다."
              : blockerOn
                ? "켜져 있습니다. Shorts와 Reels 플레이어가 열리면 그 앱을 닫고 Level 흐름을 엽니다."
                : "꺼져 있습니다. 접근성 서비스가 켜져 있어도 YouTube와 Instagram을 닫지 않고, Level 흐름을 열지 않습니다."}
          </p>
        </div>
        <Switch
          id="blocker-enabled"
          checked={blockerOn}
          disabled={blocker === null}
          aria-label="쇼츠·릴스 개입"
          onCheckedChange={(checked) => {
            const next = Boolean(checked);
            setBlocker(next);
            void HanbakjaGuard.setBlocker({ enabled: next }).catch(() => {
              setBlocker(!next);
            });
          }}
        />
      </div>
      <h2 className="text-base font-medium">실제 쇼츠·릴스 개입</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        안드로이드에서 접근성 서비스를 직접 켜면, YouTube Shorts 플레이어와
        Instagram Reels 플레이어가 열릴 때 같은 이유 질문과 Level 1~3 개입이
        나옵니다. 쇼츠 플레이어는 영상을 멈추고, YouTube를 나가지 않은 채로 그 화면
        위에 이유 질문을 띄웁니다. 고르기 전에는 YouTube를 닫거나 종료하지 않습니다.
        홈의 쇼츠 선반, 일반 영상, Instagram 피드와 스토리는 열어도 개입이 나오지
        않습니다. 위의 스위치를 끄면 이 개입은 멈추고, 접근성 서비스는 그대로
        두어도 됩니다.
      </p>
      <p className="text-sm leading-6 text-muted-foreground">
        기록은 이 기기에만 남습니다. 화면의 글, 메시지, 비밀번호, 계정은 저장하거나
        보내지 않습니다. 쇼츠와 릴스가 아닌 앱은 보지 않습니다. 사용 시간과 차단
        시간은 항상 실제 시간입니다.
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
        <li>아래 버튼을 누르거나 휴대폰의 설정 앱을 엽니다.</li>
        <li>
          <strong className="font-medium text-foreground">설정 → 접근성</strong>으로
          이동합니다. Focus on이 바로 없으면{" "}
          <strong className="font-medium text-foreground">설치된 앱</strong> 또는{" "}
          <strong className="font-medium text-foreground">다운로드한 앱</strong>을
          엽니다.
        </li>
        <li>Focus on을 켜고, 확인 창에서 허용을 누릅니다.</li>
      </ol>
      <p className="text-sm leading-6 text-muted-foreground">
        안드로이드 13 이상에서는 그 전에{" "}
        <strong className="font-medium text-foreground">
          설정 → 앱 → Focus on → 오른쪽 위 ⋮ → 제한된 설정 허용
        </strong>
        이 필요할 수 있습니다.
      </p>
      {native ? (
        <p className="text-sm font-medium">
          {enabled === null
            ? "접근성 상태를 확인하고 있습니다."
            : enabled
              ? "이 기기에서 접근성 서비스가 켜져 있습니다."
              : "이 기기에서 접근성 서비스가 꺼져 있습니다."}
        </p>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          이 브라우저와 아이폰에서는 다른 앱의 Shorts·Reels를 막을 수 없습니다.
          접근성 설정 버튼은 설치한 안드로이드 앱 안에 있습니다. 스위치 선택은 이
          브라우저에 남습니다.
        </p>
      )}
      {native ? (
        <Button
          type="button"
          className="h-11"
          onClick={() => {
            void HanbakjaGuard.openSettings();
          }}
        >
          접근성 설정 열기
        </Button>
      ) : null}
    </section>
  );
}
