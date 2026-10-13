import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthCard, AuthScreen, useEmailDomain } from '@/components/auth';
import { Span, Text } from '@/components/Text';
import { Button, Field, FormMessage, InputGroup, PasswordInput } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Me } from '@/lib/types';

export default function Login() {
  const router = useRouter();
  const { setUser } = useSession();
  const domain = useEmailDomain();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!id.trim() || !password) return;
    setBusy(true);
    setError(null);
    // Accept "name.surname", the full address, or "@username".
    const v = id.trim();
    const login = v.startsWith('@') || v.includes('@') ? v : `${v}@${domain}`;
    try {
      const { user } = await post<{ user: Me }>('/auth/login', { email: login, password });
      // The protected routes swap to the signed-in app on their own.
      setUser(user);
    } catch (err) {
      setError(err as Error);
      setBusy(false);
    }
  };

  return (
    <AuthScreen>
      <AuthCard title="Welcome back" lead="Log in with your school email or @username.">
        {error && (
          <FormMessage>
            {error.message}
            {error instanceof ApiError && error.code === 'unverified' && (
              <Span w={700} onPress={() => router.replace('/signup')}> Sign up again</Span>
            )}
          </FormMessage>
        )}
        <Field label="Email or username">
          <InputGroup
            value={id}
            onChangeText={setId}
            autoFocus
            placeholder="name.surname"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            returnKeyType="next"
            suffix={id && !id.includes('@') ? `@${domain}` : null}
            accessibilityLabel="Email or username"
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel="Password"
          />
        </Field>
        <Text w={700} size={14} color="greenDeep" onPress={() => router.push('/forgot')} style={{ marginTop: -6, alignSelf: 'flex-start' }} accessibilityRole="link">
          Forgot password?
        </Text>
        <Button title="Log in" size="lg" block loading={busy} disabled={!id.trim() || !password} onPress={submit} />
        <View style={{ alignItems: 'center' }}>
          <Text size={14} color="muted">
            New to EdSpace? <Span w={700} color="greenDeep" onPress={() => router.replace('/signup')}>Create an account</Span>
          </Text>
        </View>
      </AuthCard>
    </AuthScreen>
  );
}
