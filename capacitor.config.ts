import type { CapacitorConfig } from '@capacitor/cli';

// URL del server di produzione (verrà impostato dopo il deployment)
const SERVER_URL = process.env.CAPACITOR_SERVER_URL || '';

const config: CapacitorConfig = {
  appId: 'com.dispensa.app',
  appName: 'Dispensa',
  webDir: 'out',
  server: {
    // Se SERVER_URL è impostato, carica dal server remoto
    // Altrimenti usa i file statici locali
    url: SERVER_URL || undefined,
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    Preferences: {
      group: 'Dispensa'
    }
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
