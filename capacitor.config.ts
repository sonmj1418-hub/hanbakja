import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.hanbakja.shorts",
  appName: "한박자",
  webDir: "out",
  android: {
    allowMixedContent: false,
  },
};

export default config;
