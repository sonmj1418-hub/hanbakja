import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.hanbakja.shorts",
  appName: "Focus on",
  webDir: "out",
  android: {
    allowMixedContent: false,
  },
};

export default config;
