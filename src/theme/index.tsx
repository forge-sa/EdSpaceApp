// EdSpace palette, from the website's styles.css (taken from the EdVille
// Schedule artwork: sage background, bold green blocks with cream lettering,
// cream panels, navy type).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SystemUI from 'expo-system-ui';
import { Appearance, useColorScheme } from 'react-native';

export const palette = {
  light: {
    bg: '#e3edc8',
    surface: '#f3fadb',
    surfaceRaised: '#fafdf0',
    hover: '#ebf4d0',
    border: '#d4e2b3',
    borderStrong: '#bccf95',
    green: '#00963f',
    greenHover: '#00843a',
    greenDeep: '#04692f',
    greenInk: '#eafac9',
    greenSoft: '#d9ecbf',
    text: '#1e2235',
    muted: '#5b6656',
    faint: '#879280',
    like: '#e0245e',
    likeSoft: 'rgba(224, 36, 94, 0.1)',
    danger: '#cf3434',
    dangerSoft: 'rgba(207, 52, 52, 0.1)',
    warn: '#c98200',
    backdrop: 'rgba(22, 32, 24, 0.45)',
    shadow: '#1e2235',
  },
  dark: {
    bg: '#0e1711',
    surface: '#131f17',
    surfaceRaised: '#18261c',
    hover: '#1a2a1f',
    border: '#243829',
    borderStrong: '#335039',
    green: '#00963f',
    greenHover: '#0aa84b',
    greenDeep: '#6fd396',
    greenInk: '#eafac9',
    greenSoft: '#173a23',
    text: '#e6f1d5',
    muted: '#9cae97',
    faint: '#6f826b',
    like: '#f0457b',
    likeSoft: 'rgba(240, 69, 123, 0.14)',
    danger: '#f06262',
    dangerSoft: 'rgba(240, 98, 98, 0.12)',
    warn: '#e0a030',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    shadow: '#000000',
  },
};

export type Colors = typeof palette.light;
export type ColorName = keyof Colors;
export type ThemeSetting = 'light' | 'dark' | 'system';

const KEY = 'edspace-theme';

interface ThemeValue {
  colors: Colors;
  dark: boolean;
  setting: ThemeSetting;
  setSetting: (s: ThemeSetting) => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

// Overriding the app's appearance (rather than only our own colors) makes
// native UI — alerts, keyboards, pickers — follow the chosen theme too.
const apply = (s: ThemeSetting) => Appearance.setColorScheme(s === 'system' ? 'unspecified' : s);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<ThemeSetting>('system');
  const [ready, setReady] = useState(false);
  const scheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') {
          setSettingState(v);
          apply(v);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setSetting = useCallback((s: ThemeSetting) => {
    setSettingState(s);
    apply(s);
    AsyncStorage.setItem(KEY, s).catch(() => {});
  }, []);

  const dark = scheme === 'dark';

  // The root view shows around the app (e.g. behind system bars while a
  // screen transitions); keep it in the current theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(dark ? palette.dark.surface : palette.light.surface).catch(() => {});
  }, [dark]);

  const value = useMemo(
    () => ({ colors: dark ? palette.dark : palette.light, dark, setting, setSetting, ready }),
    [dark, setting, setSetting, ready],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export const useColors = () => useTheme().colors;

/** Inter, one family per weight (Android ignores fontWeight on custom fonts). */
export const fonts = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
  900: 'Inter_900Black',
} as const;

export type Weight = keyof typeof fonts;
