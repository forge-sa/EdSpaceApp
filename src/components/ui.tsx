import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { CircleQuestionMark, Eye, EyeOff } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, View,
  type PressableProps, type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { useColors, type ColorName } from '@/theme';
import { Input, Text } from './Text';

// ── Buttons ──────────────────────────────────────────────────────────────

type Variant = 'primary' | 'outline' | 'dark' | 'danger' | 'dangerOutline' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = 'primary', size = 'md', block, loading, disabled, icon: Icon, style, ...rest }: ButtonProps) {
  const c = useColors();
  const look: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.green, fg: c.greenInk },
    outline: { bg: 'transparent', fg: c.text, border: c.borderStrong },
    dark: { bg: c.text, fg: c.surface },
    danger: { bg: c.danger, fg: '#fff' },
    dangerOutline: { bg: 'transparent', fg: c.danger, border: c.danger },
    ghost: { bg: 'transparent', fg: c.greenDeep },
  };
  const v = look[variant];
  const pad = { sm: { paddingVertical: 7, paddingHorizontal: 14 }, md: { paddingVertical: 10, paddingHorizontal: 18 }, lg: { paddingVertical: 14, paddingHorizontal: 18 } }[size];
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 16 : 15;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        styles.btn,
        pad,
        { backgroundColor: v.bg },
        v.border && { borderWidth: 1.5, borderColor: v.border },
        block && { alignSelf: 'stretch' },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" style={{ height: fontSize * 1.4 }} />
      ) : (
        <>
          {Icon && <Icon size={fontSize + 2} color={v.fg} strokeWidth={2.2} />}
          <Text w={700} size={fontSize} color={v.fg} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon, label, onPress, color, size = 21, badge, style, disabled,
}: { icon: LucideIcon; label: string; onPress?: () => void; color?: string; size?: number; badge?: number; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: c.hover }, disabled && { opacity: 0.45 }, style]}
    >
      <Icon size={size} color={color ?? c.text} strokeWidth={2} />
      {badge ? <Badge count={badge} style={{ position: 'absolute', top: 1, right: 0 }} /> : null}
    </Pressable>
  );
}

export function Badge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  if (!count) return null;
  return (
    <View style={[styles.badge, { backgroundColor: c.green }, style]}>
      <Text w={800} size={10} color="greenInk" style={{ lineHeight: 14 }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// ── Forms ────────────────────────────────────────────────────────────────

export function Field({ label, hint, hintTone, children, optional }: {
  label?: string; hint?: ReactNode; hintTone?: 'error' | 'ok'; children: ReactNode; optional?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text w={700} size={13}>
          {label}
          {optional && <Text size={13} color="muted"> (optional)</Text>}
        </Text>
      )}
      {children}
      {hint ? (
        <Text size={13} color={hintTone === 'error' ? 'danger' : hintTone === 'ok' ? 'greenDeep' : 'muted'}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Input with fixed text before or after it (e.g. "@edville.edu.kz"). */
export function InputGroup({ prefix, suffix, ...props }: TextInputProps & { prefix?: ReactNode; suffix?: string | null }) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.group, { borderColor: focused ? c.green : c.borderStrong, backgroundColor: c.surfaceRaised }]}>
      {prefix ? <View style={{ paddingLeft: 14 }}>{prefix}</View> : null}
      <Input
        bare
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[{ flex: 1, paddingVertical: 12, paddingLeft: prefix ? 6 : 14, paddingRight: suffix ? 6 : 14 }, props.style]}
      />
      {suffix ? <Text w={600} color="muted" style={{ paddingRight: 14 }} numberOfLines={1}>{suffix}</Text> : null}
    </View>
  );
}

export function PasswordInput(props: TextInputProps) {
  const c = useColors();
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.group, { borderColor: focused ? c.green : c.borderStrong, backgroundColor: c.surfaceRaised }]}>
      <Input
        bare
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{ flex: 1, paddingVertical: 12, paddingLeft: 14 }}
      />
      <Pressable onPress={() => setShown((s) => !s)} accessibilityLabel={shown ? 'Hide password' : 'Show password'} hitSlop={8} style={{ padding: 10, marginRight: 4 }}>
        {shown ? <EyeOff size={19} color={c.muted} /> : <Eye size={19} color={c.muted} />}
      </Pressable>
    </View>
  );
}

export function FormMessage({ tone = 'error', children }: { tone?: 'error' | 'note'; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.message, { backgroundColor: tone === 'error' ? c.dangerSoft : c.greenSoft }]}>
      <Text size={14} w={tone === 'error' ? 600 : 500} color={tone === 'error' ? 'danger' : 'greenDeep'}>{children}</Text>
    </View>
  );
}

// ── States ───────────────────────────────────────────────────────────────

export function Loading({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ padding: 28, alignItems: 'center' }, style]} accessibilityLabel="Loading">
      <ActivityIndicator color={c.green} />
    </View>
  );
}

export function Empty({ icon: Icon, title, children, action }: { icon?: LucideIcon; title?: string; children?: ReactNode; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ paddingVertical: 48, paddingHorizontal: 28, alignItems: 'center' }}>
      {Icon && (
        <View style={[styles.art, { backgroundColor: c.greenSoft }]}>
          <Icon size={30} color={c.green} />
        </View>
      )}
      {title && <Text w={800} size={21} center style={{ marginBottom: 6 }}>{title}</Text>}
      {children ? <Text color="muted" center style={{ maxWidth: 340, marginBottom: 16 }}>{children}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 28, alignItems: 'center', gap: 14 }}>
      <Text color="muted" center>{message}</Text>
      {onRetry && <Button title="Try again" variant="outline" onPress={onRetry} />}
    </View>
  );
}

/** For unknown paths, e.g. a top-level link that isn't /@handle. */
export function NotFound() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Empty icon={CircleQuestionMark} title="This page doesn’t exist">The link may be broken, or the page may have been removed.</Empty>
    </View>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.message, { backgroundColor: c.greenSoft, marginHorizontal: 16, marginVertical: 12 }]}>
      <Text size={14} w={500} color="greenDeep">{children}</Text>
    </View>
  );
}

export function Pill({ children, color = 'muted', icon: Icon }: { children: ReactNode; color?: ColorName; icon?: LucideIcon }) {
  const c = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: c.hover }]}>
      {Icon && <Icon size={12} color={c[color]} />}
      <Text w={600} size={12} color={color} style={{ lineHeight: 16 }}>{children}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />;
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }, style]}>
      <Text w={800} size={19}>{children}</Text>
    </View>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

/** The website's underlined tab strip. Scrolls sideways when tabs don't fit. */
export function Tabs<T extends string>({ tabs, value, onChange, style }: {
  tabs: TabDef<T>[]; value: T; onChange: (id: T) => void; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const items = tabs.map((t) => {
    const active = t.id === value;
    return (
      <Pressable
        key={t.id}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => {
          if (!active) {
            Haptics.selectionAsync().catch(() => {});
            onChange(t.id);
          }
        }}
        style={({ pressed }) => [styles.tab, pressed && { backgroundColor: c.hover }]}
      >
        <Text w={active ? 800 : 600} color={active ? 'text' : 'muted'} numberOfLines={1}>{t.label}</Text>
        {active && <View style={[styles.tabBar, { backgroundColor: c.green }]} />}
      </Pressable>
    );
  });
  return (
    <View style={[{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, backgroundColor: c.surface }, style]}>
      {tabs.length > 3 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {items}
        </ScrollView>
      ) : (
        <View style={{ flexDirection: 'row' }}>{items}</View>
      )}
    </View>
  );
}

/** Segmented control, as used for the theme picker. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (id: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.seg, { backgroundColor: c.hover }]} accessibilityRole="radiogroup">
      {options.map(({ id, label, icon: Icon }) => {
        const on = id === value;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(id)}
            style={[styles.segItem, on && { backgroundColor: c.surfaceRaised, ...shadow(c.shadow, 0.08) }]}
          >
            {Icon && <Icon size={16} color={on ? c.text : c.muted} />}
            <Text w={600} color={on ? 'text' : 'muted'}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small cross-platform shadow. */
export const shadow = (color: string, opacity = 0.12, radius = 12, y = 4): ViewStyle => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: y },
  elevation: Math.round(radius / 2),
});

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  group: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  message: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  art: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tab: { flexGrow: 1, minWidth: 84, alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  tabBar: { position: 'absolute', bottom: 0, width: '50%', maxWidth: 60, height: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  seg: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 13, alignSelf: 'flex-start' },
  segItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10 },
});
