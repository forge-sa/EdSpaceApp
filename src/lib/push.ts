import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { del, post } from './api';

// Push notifications. The server pushes every in-app notification to the
// phones a user is signed in on; the token is tied to the session, so logging
// out stops them. Remote push doesn't work in Expo Go on Android (it needs a
// development or store build) and needs the Firebase / APNs setup in README.

const PREF_KEY = 'edspace-push'; // 'off' once turned off in Settings
const TOKEN_KEY = 'edspace-push-token';
export const CHANNEL_ID = 'default';

export type PushState = 'on' | 'off' | 'denied' | 'unavailable';

// While the app is open, show pushes as a banner too (no sound).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

function supported() {
  if (Platform.OS === 'web' || !projectId) return false;
  return !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);
}

async function readPref() {
  try {
    return await AsyncStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

/**
 * Gets this phone's push token and sends it to the server. Asks for
 * permission only when `ask` is set and the person hasn't answered yet.
 */
export async function registerForPush({ ask }: { ask: boolean }): Promise<PushState> {
  if (!supported()) return 'unavailable';
  if ((await readPref()) === 'off') return 'off';

  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00963F',
    });
  }
  let { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask && canAskAgain) {
    ({ status } = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
  }
  if (status !== 'granted') return 'denied';

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await post('/me/push-token', { token, platform: Platform.OS });
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return 'on';
  } catch (err) {
    // No network, or missing push credentials in this build.
    if (__DEV__) console.warn('[push] could not register:', err);
    return 'unavailable';
  }
}

/** What Settings shows, without asking for anything. */
export async function getPushState(): Promise<PushState> {
  if (!supported()) return 'unavailable';
  if ((await readPref()) === 'off') return 'off';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  // Not asked yet: switching it on in Settings will ask.
  return status === 'granted' ? 'on' : canAskAgain ? 'off' : 'denied';
}

/** Settings → Push notifications. */
export async function setPushEnabled(on: boolean): Promise<PushState> {
  await AsyncStorage.setItem(PREF_KEY, on ? 'on' : 'off').catch(() => {});
  if (on) return registerForPush({ ask: true });
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (token) await del('/me/push-token', { token }).catch(() => {});
  return 'off';
}

/** The app icon's badge follows the unread count. */
export function setAppBadge(count: number) {
  if (Platform.OS === 'web') return;
  Notifications.setBadgeCountAsync(count).catch(() => {});
}
