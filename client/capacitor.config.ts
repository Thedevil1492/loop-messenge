import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loop.messenger',
  appName: 'Loop Messenger',
  webDir: '../server/public',
  server: {
    url: 'https://industrial-applications-healing-brick.trycloudflare.com',
    cleartext: true,
  },
};

export default config;
