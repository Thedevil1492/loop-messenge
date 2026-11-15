import type { CapacitorConfig } from '@capacitor/cli';

const backendUrl = process.env.VITE_API_URL || 'https://loop-messenge.onrender.com';

const config: CapacitorConfig = {
  appId: 'com.loop.app',
  appName: 'Loop',
  webDir: '../server/public',
  server: {
    url: backendUrl,
    cleartext: true,
  },
};

export default config;
