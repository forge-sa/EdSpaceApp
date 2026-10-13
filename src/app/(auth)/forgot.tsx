import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { AuthCard, AuthScreen, CodeInput, EmailField, splitEmail, useEmailDomain } from '@/components/auth';
import { Span, Text } from '@/components/Text';
import { Button, Field, FormMessage, PasswordInput } from '@/components/ui';
import { post } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Me } from '@/lib/types';
import { useColors } from '@/theme';

export default function Forgot() {
  const c = useColors();
  const { setUser } = useSession();
  const domain = useEmailDomain();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const { local, wrongDomain } = splitEmail(email, domain);
    if (wrongDomain || !local) return setError({ message: `Use your @${domain} school email.` });
    setBusy(true);
    setError(null);
    try {
      await post('/auth/forgot', { email: `${local}@${domain}` });
      setSentTo(`${local}@${domain}`);
    } catch (err) {
      setError(err as Error);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      const { user } = await post<{ user: Me }>('/auth/reset', { email: sentTo, code, password });
      setUser(user);
    } catch (err) {
      setError(err as Error);
      setBusy(false);
    }
  };

  if (!sentTo) {
    return (
      <AuthScreen>
        <AuthCard title="Reset password" lead="We’ll email you a code to set a new password.">
          {error && <FormMessage>{error.message}</FormMessage>}
          <EmailField value={email} onChange={setEmail} autoFocus />
          <Button title="Send code" size="lg" block loading={busy} disabled={!email.trim()} onPress={send} />
        </AuthCard>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthCard title="Enter your code" lead={<>If <Span w={700} color="text">{sentTo}</Span> has an EdSpace account, a code is on its way.</>}>
        {error && <FormMessage>{error.message}</FormMessage>}
        <CodeInput value={code} onChange={setCode} label="Reset code" />
        <Field label="New password">
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="At least 8 characters"
            accessibilityLabel="New password"
          />
        </Field>
        <Button title="Set password & log in" size="lg" block loading={busy} disabled={code.length !== 6 || password.length < 8} onPress={reset} />
        <Pressable onPress={() => { setError(null); setSentTo(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' }} hitSlop={8}>
          <ArrowLeft size={16} color={c.muted} />
          <Text w={600} size={14} color="muted">Back</Text>
        </Pressable>
      </AuthCard>
    </AuthScreen>
  );
}
