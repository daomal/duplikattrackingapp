
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.01e40f8027244c728c9ca8241418b3bd',
  appName: 'Cargo Compass',
  webDir: 'dist',
  server: {
    url: 'https://01e40f80-2724-4c72-8c9c-a8241418b3bd.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: null,
      keystoreAlias: null,
      keystorePassword: null,
      keystoreAliasPassword: null,
    },
    backgroundColor: "#F6EFDB", // Light cream color for splash screen
    splashScreenBackground: "#6E59A5", // Purple background
    splashScreenFadeOutDuration: 500, // Half-second fade out
    hideLogs: false, // Keep logs for debugging
    webContentsDebuggingEnabled: true, // Enable web debugging  
  },
  ios: {
    contentInset: "always",
    allowsLinkPreview: true,
    scrollEnabled: true,
    backgroundColor: "#F6EFDB", // Match Android
    scheme: "cargocompass",
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#6E59A5",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#FFFFFF",
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
