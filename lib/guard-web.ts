import { WebPlugin } from "@capacitor/core";
import type { HanbakjaGuardPlugin } from "./guard";

const BLOCKER_KEY = "hanbakja.blocker";

function readBlocker(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(BLOCKER_KEY) !== "0";
}

export class HanbakjaGuardWeb extends WebPlugin implements HanbakjaGuardPlugin {
  async getStatus() {
    return {
      enabled: false,
      pendingTarget: "",
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

  async finish() {}

  async openSettings() {}
}
