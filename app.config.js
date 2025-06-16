import 'dotenv/config';

export default {
  expo: {
    name: "BookMate",
    slug: "bookmate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.bookmate.reading.v3",
      buildNumber: "1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.bookmate.reading.app",
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      usesCleartextTraffic: true,
      networkSecurityConfig: "./android/app/src/main/res/xml/network_security_config.xml"
    },
    web: {
      favicon: "./assets/icon.png"
    },
    extra: {

      // Environment variables'dan güvenli şekilde oku
      openaiApiKey: process.env.OPENAI_API_KEY || process.env.EAS_BUILD_OPENAI_API_KEY,
      googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || process.env.EAS_BUILD_GOOGLE_BOOKS_API_KEY,
      useDemoMode: process.env.USE_DEMO_MODE === 'true',
      openaiModel: "gpt-3.5-turbo",
      maxTokens: 1000,
      temperature: 0.7
    }
  }
}; 