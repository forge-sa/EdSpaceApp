import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Everything lives in app.json. This only adds Firebase's google-services.json,
// which Android push notifications need, once it has been put in the project
// root (see README → Push notifications), so builds work before and after.
const GOOGLE_SERVICES = './google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const hasFirebase = fs.existsSync(path.join(__dirname, GOOGLE_SERVICES));
  return {
    ...config,
    android: { ...config.android, ...(hasFirebase ? { googleServicesFile: GOOGLE_SERVICES } : {}) },
  } as ExpoConfig;
};
