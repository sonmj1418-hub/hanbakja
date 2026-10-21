/** Noun on the native player sheet. The practice feed has no source label and stays 쇼츠. */
export function sheetPlayerNoun(sourceLabel: string | null | undefined): "릴스" | "쇼츠" {
  return sourceLabel?.includes("Reels") ? "릴스" : "쇼츠";
}

export function isNativePlayerSheet(sourceLabel: string | null | undefined): boolean {
  if (!sourceLabel) return false;
  return sourceLabel.includes("Reels") || sourceLabel.includes("YouTube");
}

export function sheetReasonTitle(sourceLabel: string | null | undefined): string {
  return sheetPlayerNoun(sourceLabel) === "릴스"
    ? "왜 릴스를 실행하셨나요?"
    : "왜 쇼츠를 실행하셨나요?";
}

export function nativeSheetHint(sourceLabel: string | null | undefined): string {
  if (isNativePlayerSheet(sourceLabel)) {
    const noun = sheetPlayerNoun(sourceLabel);
    return ` 나가기를 고르면 이 창만 닫히고 ${noun}는 이어서 재생되지 않습니다. ${noun} 보기를 고르면 멈춘 영상이 다시 재생됩니다.`;
  }
  if (sourceLabel) {
    return " 나가기, 강제 종료, 시간 차단을 고르면 그 화면을 닫고 Focus on으로 돌아갑니다.";
  }
  return "";
}

export function sheetWatchLabel(sourceLabel: string | null | undefined): string {
  return sheetPlayerNoun(sourceLabel) === "릴스" ? "릴스 보기" : "쇼츠 보기";
}

/** Object phrase after an alternative, for example 쇼츠를 볼지. */
export function sheetWatchAgain(sourceLabel: string | null | undefined): string {
  return sheetPlayerNoun(sourceLabel) === "릴스" ? "릴스를 볼지" : "쇼츠를 볼지";
}

export function sheetLockOffer(sourceLabel: string | null | undefined): string {
  const noun = sheetPlayerNoun(sourceLabel);
  return `일정 시간 ${noun} 열기를 막을 수 있습니다.`;
}

export function sheetLockConfirm(sourceLabel: string | null | undefined): string {
  const noun = sheetPlayerNoun(sourceLabel);
  return `이 시간이 끝나기 전에는 ${noun} 피드가 열리지 않습니다. 차단 시간은 실제 분입니다.`;
}
