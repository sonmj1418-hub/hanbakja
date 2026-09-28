import { Capacitor, registerPlugin } from "@capacitor/core";

export type GuardTarget = "youtube" | "instagram";
export type GuardOutcome = "watch" | "leave" | "block";

export type GuardStatus = {
  enabled: boolean;
  pendingTarget: string;
  watching: boolean;
  blockerEnabled: boolean;
};

export interface HanbakjaGuardPlugin {
  getStatus(): Promise<GuardStatus>;
  setBlocker(options: { enabled: boolean }): Promise<void>;
  takeWatch(): Promise<{ seconds: number; ended: boolean }>;
  finish(options: { outcome: GuardOutcome; target: GuardTarget }): Promise<void>;
  openSettings(): Promise<void>;
}

export const HanbakjaGuard = registerPlugin<HanbakjaGuardPlugin>("HanbakjaGuard", {
  web: () => import("./guard-web").then((mod) => new mod.HanbakjaGuardWeb()),
});

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function isGuardTarget(value: string): value is GuardTarget {
  return value === "youtube" || value === "instagram";
}

export function guardSourceLabel(target: GuardTarget): string {
  return target === "instagram" ? "Instagram Reels" : "YouTube Shorts";
}

const GUARD_SESSION = "hanbakja-guard-session";

export function markGuardSession() {
  sessionStorage.setItem(GUARD_SESSION, "1");
}

export function hasGuardSession(): boolean {
  return sessionStorage.getItem(GUARD_SESSION) === "1";
}

export function clearGuardSession() {
  sessionStorage.removeItem(GUARD_SESSION);
}
