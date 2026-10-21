"use client";

import { Button } from "@/components/ui/button";
import { useStore } from "@/components/store";

/** 처음 실행에서만 묻는다. 동의하기 전에는 서버로 보내지 않는다. */
export function UsageSyncPrompt() {
  const { answerUsageSync } = useStore();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-sync-title"
    >
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 id="usage-sync-title" className="text-xl font-semibold tracking-tight">
          사용 기록을 서버에 보낼까요?
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          사용 기록은 이 휴대폰에 남습니다. 동의하면 세션, 개입, 잠금 시도도 서버로 보냅니다.
          이유, 성찰, 공부 카드, 설정, 화면의 글은 보내지 않습니다. 설정에서 나중에 끌 수 있습니다.
        </p>
        <div className="flex flex-col gap-2">
          <Button type="button" className="h-11" onClick={() => answerUsageSync(true)}>
            보내기
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => answerUsageSync(false)}>
            보내지 않기
          </Button>
        </div>
      </div>
    </div>
  );
}
