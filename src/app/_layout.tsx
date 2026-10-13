// Per-weight imports: the package index would bundle every weight and italic.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { Inter_900Black } from '@expo-google-fonts/inter/900Black';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme, type Theme } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Wordmark } from '@/components/brand';
import { ReportProvider } from '@/components/PostCard';
import { ActionSheetProvider } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { ToastProvider } from '@/components/Toast';
import { Button } from '@/components/ui';
import { queryClient } from '@/lib/queries';
import { SessionProvider, useSession } from '@/lib/session';
import { fonts, ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
// (Expo Go can't customise the splash screen; real builds can.)
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) SplashScreen.setOptions({ fade: true, duration: 250 });

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <ToastProvider>
                <ActionSheetProvider>
                  <ReportProvider>
                    <Root />
                  </ReportProvider>
                </ActionSheetProvider>
              </ToastProvider>
            </SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { colors, dark, ready: themeReady } = useTheme();
  const { user, bootError, boot } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });
  // Keep the splash up until we know who's signed in, so nobody sees a flash
  // of the login screen on the way to their feed.
  const loading = !themeReady || (!fontsLoaded && !fontError) || (user === undefined && !bootError);

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  const navTheme = useMemo<Theme>(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    const face = (w: keyof typeof fonts) => ({ fontFamily: fonts[w], fontWeight: 'normal' as const });
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.green,
        background: colors.surface,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.green,
      },
      fonts: { regular: face(400), medium: face(500), bold: face(700), heavy: face(800) },
    };
  }, [dark, colors]);

  if (loading) return null;

  if (bootError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, backgroundColor: colors.bg }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Wordmark size={32} />
        <Text color="muted" center>{bootError}</Text>
        <Button title="Try again" onPress={boot} />
      </View>
    );
  }

  return (
    <NavigationTheme value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </NavigationTheme>
  );
}
