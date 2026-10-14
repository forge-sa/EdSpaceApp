import { Stack } from 'expo-router';
import { PushNotifications } from '@/components/PushNotifications';
import { fonts, useColors } from '@/theme';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const c = useColors();
  return (
    <>
    <PushNotifications />
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: fonts[800], fontSize: 18 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.surface },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* These draw their own header (see ModalHeader for why). */}
      <Stack.Screen name="compose" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="new-club" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="parliament-role" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
    </>
  );
}
