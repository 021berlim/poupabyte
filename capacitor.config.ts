import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "br.com.poupabyte.app",
  appName: "PoupaByte",
  webDir: "out",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#050816",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
