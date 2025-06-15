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
      bundleIdentifier: "com.bookmate.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.bookmate.app",
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
      eas: {
        projectId: "13360e4e-4d23-4374-bc21-164f0211a046"
      },
      // Environment variables'dan güvenli şekilde oku
      openaiApiKey: process.env.OPENAI_API_KEY,
      googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
      useDemoMode: false,
      openaiModel: "gpt-3.5-turbo",
      maxTokens: 1000,
      temperature: 0.7
    }
  }
}; 