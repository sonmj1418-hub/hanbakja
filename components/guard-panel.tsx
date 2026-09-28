"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HanbakjaGuard, isNativeAndroid } from "@/lib/guard";

export function GuardPanel() {
  const [native, setNative] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const onAndroid = isNativeAndroid();
    setNative(onAndroid);
    if (!onAndroid) return;
    let stopped = false;

    async function read() {
      try {
        const status = await HanbakjaGuard.getStatus();
        if (!stopped) setEnabled(status.enabled);
      } catch {
        if (!stopped) setEnabled(false);
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

  return (
    <section className="space-y-3 rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <h2 className="text-base font-medium">실제 쇼츠·릴스 개입</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        안드로이드에서 접근성 서비스를 직접 켜면, YouTube Shorts와 Instagram
        Reels 화면이 열릴 때 같은 이유 질문과 Level 1~3 개입이 나옵니다. 나가기,
        강제 종료, 시간 차단을 고르면 그 화면에서 뒤로 나와 한박자 홈으로
        돌아옵니다. 시청을 고르면 잠시 그 화면으로 돌아갑니다.
      </p>
      <p className="text-sm leading-6 text-muted-foreground">
        기록은 이 기기에만 남습니다. 화면의 글, 메시지, 비밀번호, 계정은 저장하거나
        보내지 않습니다. 쇼츠와 릴스가 아닌 앱은 보지 않습니다.
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
        <li>아래 버튼을 누르거나 휴대폰의 설정 앱을 엽니다.</li>
        <li>
          <strong className="font-medium text-foreground">설정 → 접근성</strong>으로
          이동합니다. 한박자가 바로 없으면{" "}
          <strong className="font-medium text-foreground">설치된 앱</strong> 또는{" "}
          <strong className="font-medium text-foreground">다운로드한 앱</strong>을
          엽니다.
        </li>
        <li>한박자를 켜고, 확인 창에서 허용을 누릅니다.</li>
      </ol>
      <p className="text-sm leading-6 text-muted-foreground">
        안드로이드 13 이상에서는 그 전에{" "}
        <strong className="font-medium text-foreground">
          설정 → 앱 → 한박자 → 오른쪽 위 ⋮ → 제한된 설정 허용
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
          접근성 설정 버튼은 설치한 안드로이드 앱 안에 있습니다.
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
