import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/lib/session';
import { fonts, useColors } from '@/theme';
import { Wordmark } from './brand';
import { Input, Text } from './Text';
import { Field, InputGroup, shadow } from './ui';

export function useEmailDomain() {
  const { config } = useSession();
  return config?.emailDomain ?? 'edville.edu.kz';
}

/** Turns what the user typed into the local part, or flags another domain. */
export function splitEmail(raw: string, domain: string) {
  const v = raw.trim().toLowerCase();
  const at = v.indexOf('@');
  if (at === -1) return { local: v, wrongDomain: false };
  const d = v.slice(at + 1);
  return { local: v.slice(0, at), wrongDomain: d !== domain && d !== '' };
}

/** Scrollable, keyboard-aware page with the wordmark above a card. */
export function AuthScreen({ children, wordmark = true }: { children: ReactNode; wordmark?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16, paddingBottom: insets.bottom + 24, gap: 22 }}
    >
      {wordmark && <View style={{ alignItems: 'center' }}><Wordmark size={28} /></View>}
      {children}
    </KeyboardAwareScrollView>
  );
}

export function AuthCard({ title, lead, icon: Icon, children }: { title: string; lead?: ReactNode; icon?: LucideIcon; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.card, shadow(c.shadow, 0.1, 24, 8), { backgroundColor: c.surface, borderColor: c.border }]}>
      {Icon && (
        <View style={[styles.icon, { backgroundColor: c.greenSoft }]}>
          <Icon size={28} color={c.green} />
        </View>
      )}
      <View style={{ gap: 6 }}>
        <Text w={800} size={25}>{title}</Text>
        {lead ? <Text color="muted">{lead}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function EmailField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const domain = useEmailDomain();
  const { wrongDomain } = splitEmail(value, domain);
  return (
    <Field label="School email" hint={wrongDomain ? `Only @${domain} emails can join EdSpace.` : undefined} hintTone="error">
      <InputGroup
        value={value}
        onChangeText={onChange}
        autoFocus={autoFocus}
        placeholder="name.surname"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        suffix={value.includes('@') ? null : `@${domain}`}
        accessibilityLabel="School email"
      />
    </Field>
  );
}

export function CodeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Input
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
      autoFocus
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={6}
      placeholder="••••••"
      accessibilityLabel={label}
      style={{ fontFamily: fonts[800], fontSize: 26, letterSpacing: 12, textAlign: 'center', fontVariant: ['tabular-nums'] }}
    />
  );
}

/** Seconds left on the one-minute "send a new code" cooldown. */
export function useCooldown(): [number, () => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);
  return [Math.max(0, Math.ceil((until - now) / 1000)), () => {
    setNow(Date.now());
    setUntil(Date.now() + 60_000);
  }];
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: -4 },
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24, gap: 16, width: '100%', maxWidth: 440, alignSelf: 'center' },
});
