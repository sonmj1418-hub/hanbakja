import { WebPlugin } from "@capacitor/core";
import type { HanbakjaGuardPlugin } from "./guard";

export class HanbakjaGuardWeb extends WebPlugin implements HanbakjaGuardPlugin {
  async getStatus() {
    return { enabled: false, pendingTarget: "", watching: false };
  }

  async takeWatch() {
    return { seconds: 0, ended: false };
  }

  async finish() {}

  async openSettings() {}
}
