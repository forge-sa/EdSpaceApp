import type { LucideIcon } from 'lucide-react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated, Easing, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme';
import { Text } from './Text';

/**
 * A sheet that slides up from the bottom. `onClosed` fires once it is fully
 * gone — the moment it is safe to open an alert or another modal (iOS can't
 * present one while another is still dismissing).
 */
export function BottomSheet({ visible, onClose, onClosed, title, children }: {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  const closedCb = useRef(onClosed);
  useEffect(() => {
    closedCb.current = onClosed;
  });

  // Mount as soon as it should show; unmount only after the closing animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        setMounted(false);
        // iOS reports the real dismissal through onDismiss below.
        if (Platform.OS !== 'ios') setTimeout(() => closedCb.current?.(), 0);
      });
    }
  }, [visible, progress]);

  // Toggle `visible` rather than unmounting: iOS only reports onDismiss for a
  // modal that is dismissed, not one that is removed.
  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onDismiss={() => Platform.OS === 'ios' && closedCb.current?.()}
    >
      {/* A Modal is its own native window, so it needs its own safe-area provider. */}
      <SafeAreaProvider>
        <SheetBody progress={progress} onClose={onClose} title={title}>{children}</SheetBody>
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetBody({ progress, onClose, title, children }: { progress: Animated.Value; onClose: () => void; title?: string; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop, opacity: progress }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      {/* Claims stray touches so they don't bubble (through the React tree) to whatever opened the sheet. */}
      <Animated.View
        onStartShouldSetResponder={() => true}
        style={[
          styles.sheet,
          {
            backgroundColor: c.surface,
            paddingBottom: Math.max(insets.bottom, 12) + 4,
            maxHeight: height * 0.85,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }],
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />
        {title ? <Text w={800} size={17} style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 }}>{title}</Text> : null}
        {children}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ── Action sheet (menus) ─────────────────────────────────────────────────

export interface SheetOption {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
}

interface SheetRequest {
  title?: string;
  options: SheetOption[];
}

const ActionSheetContext = createContext<(r: SheetRequest) => void>(() => {});
export const useActionSheet = () => useContext(ActionSheetContext);

export function ActionSheetProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const [request, setRequest] = useState<SheetRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const show = useCallback((r: SheetRequest) => {
    setRequest(r);
    setVisible(true);
  }, []);

  const choose = (fn?: () => void) => {
    pending.current = fn ?? null;
    setVisible(false);
  };

  return (
    <ActionSheetContext.Provider value={show}>
      {children}
      <BottomSheet
        visible={visible}
        title={request?.title}
        onClose={() => choose()}
        onClosed={() => {
          const fn = pending.current;
          pending.current = null;
          setRequest(null);
          fn?.();
        }}
      >
        <View style={{ paddingHorizontal: 8 }}>
          {request?.options.map(({ label, icon: Icon, destructive, onPress }) => (
            <Pressable
              key={label}
              onPress={() => choose(onPress)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: c.hover }]}
            >
              {Icon && <Icon size={20} color={destructive ? c.danger : c.text} />}
              <Text w={600} size={16} color={destructive ? 'danger' : 'text'}>{label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => choose()} style={({ pressed }) => [styles.option, styles.cancel, { backgroundColor: pressed ? c.border : c.hover }]}>
            <Text w={700} size={16} center style={{ flex: 1 }}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </ActionSheetContext.Provider>
  );
}

// ── Select field ─────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

/** A form field that opens a list of choices (React Native has no <select>). */
export function SelectField({ value, options, placeholder, onChange, title, accessibilityLabel }: {
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  title: string;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        style={[styles.select, { borderColor: c.borderStrong, backgroundColor: c.surfaceRaised }]}
      >
        <Text size={16} color={selected ? 'text' : 'faint'} style={{ flex: 1 }} numberOfLines={1}>{selected?.label ?? placeholder}</Text>
        <ChevronDown size={18} color={c.muted} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={title}>
        <FlatList
          data={options}
          keyExtractor={(o) => o.value || '__none'}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          initialNumToRender={30}
          renderItem={({ item }) => {
            const on = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: c.hover }]}
              >
                <Text w={on ? 700 : 500} size={16} style={{ flex: 1 }}>{item.label}</Text>
                {on && <Check size={20} color={c.green} />}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12 },
  cancel: { marginTop: 6, justifyContent: 'center' },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
});
