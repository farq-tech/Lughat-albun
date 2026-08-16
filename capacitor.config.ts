import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS shell for لغات البن.
 * Loads the live Vercel storefront (same pattern as Farq Capacitor apps).
 */
const config: CapacitorConfig = {
  appId: "sa.lughat.albun",
  appName: "لغات البن",
  webDir: "mobile/www",
  server: {
    url: "https://lughat-albun.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "LughatAlbun",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#F7F1E8",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
    },
  },
};

export default config;
