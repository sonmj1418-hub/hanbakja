import { WebPlugin } from "@capacitor/core";
import type { HanbakjaGuardPlugin } from "./guard.ts";
import { overlayGuardTarget } from "./guard.ts";

const BLOCKER_KEY = "hanbakja.blocker";

function readBlocker(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(BLOCKER_KEY) !== "0";
}

export class HanbakjaGuardWeb extends WebPlugin implements HanbakjaGuardPlugin {
  async getStatus() {
    const overlay = overlayGuardTarget();
    return {
      enabled: overlay != null,
      pendingTarget: overlay ?? "",
      watching: false,
      blockerEnabled: readBlocker(),
    };
  }

  async setBlocker(options: { enabled: boolean }) {
    localStorage.setItem(BLOCKER_KEY, options.enabled ? "1" : "0");
  }

  async takeWatch() {
    return { seconds: 0, ended: false };
  }

  async finish(options: { outcome: string }) {
    const bridge = (
      window as Window & { AndroidOverlay?: { finish: (outcome: string) => void } }
    ).AndroidOverlay;
    if (bridge) bridge.finish(options.outcome);
  }

  async openSettings() {}
}
