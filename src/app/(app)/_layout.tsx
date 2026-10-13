import { Stack } from 'expo-router';
import { fonts, useColors } from '@/theme';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const c = useColors();
  return (
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
      {/* Cancel on the left, action on the right, so the title goes in the middle. */}
      <Stack.Screen name="compose" options={{ presentation: 'modal', headerTitleAlign: 'center' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerTitleAlign: 'center', title: 'Edit profile' }} />
    </Stack>
  );
}
