import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme';
import { Text } from './Text';
import { shadow } from './ui';

type Tone = 'info' | 'success' | 'error';
interface ToastItem {
  id: string;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const toast = useCallback((message: string, tone: Tone = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Sits above the tab bar; touches pass through. */}
      <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 92 }]} accessibilityLiveRegion="polite">
        {toasts.map((t) => <ToastView key={t.id} item={t} />)}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  const c = useColors();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [anim]);
  const bg = item.tone === 'error' ? c.danger : item.tone === 'success' ? c.green : c.text;
  const fg = item.tone === 'error' ? '#fff' : item.tone === 'success' ? c.greenInk : c.surface;
  return (
    <Animated.View
      style={[
        styles.toast,
        shadow(c.shadow, 0.18),
        { backgroundColor: bg, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      <Text w={600} color={fg}>{item.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8 },
  toast: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, maxWidth: '100%' },
});
