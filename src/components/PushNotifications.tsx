import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { registerForPush, setAppBadge } from '@/lib/push';
import { useSession } from '@/lib/session';

/**
 * Lives inside the signed-in part of the app: registers this phone for
 * pushes, opens the screen a tapped push is about (also when the tap launched
 * the app), and keeps the app icon's badge on the unread count.
 */
export function PushNotifications() {
  const router = useRouter();
  const { unread, refreshUnread } = useSession();

  useEffect(() => {
    registerForPush({ ask: true });
  }, []);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      Notifications.clearLastNotificationResponse();
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);
    const taps = Notifications.addNotificationResponseReceivedListener(open);
    // A push arriving while the app is open means there's something new.
    const received = Notifications.addNotificationReceivedListener(() => refreshUnread());
    return () => {
      taps.remove();
      received.remove();
    };
  }, [router, refreshUnread]);

  useEffect(() => {
    setAppBadge(unread);
  }, [unread]);
  useEffect(() => () => setAppBadge(0), []);

  return null;
}
