import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ArrowLeft, AtSign, MailCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { AuthCard, AuthScreen, CodeInput, EmailField, splitEmail, useCooldown, useEmailDomain } from '@/components/auth';
import { PlacementField, RolePicker } from '@/components/Placement';
import { Input, Span, Text } from '@/components/Text';
import { Button, Field, FormMessage, InputGroup, PasswordInput } from '@/components/ui';
import { api, ApiError, post } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Me, Role } from '@/lib/types';
import { useColors } from '@/theme';

// Survives the app being closed while the user fetches the code from their mail.
const PENDING_KEY = 'edspace-pending-signup';

interface Form {
  email: string;
  displayName: string;
  handle: string;
  role: Role;
  className: string;
  timetableTeacher: string;
  password: string;
}

export default function Signup() {
  const c = useColors();
  const router = useRouter();
  const { setUser } = useSession();
  const domain = useEmailDomain();
  const [form, setForm] = useState<Form>({ email: '', displayName: '', handle: '', role: 'student', className: '', timetableTeacher: '', password: '' });
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [handleState, setHandleState] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, startCooldown] = useCooldown();
  const handleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_KEY).then((v) => v && setPendingEmail(v)).catch(() => {});
    return () => clearTimeout(handleTimer.current);
  }, []);

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onHandle = (raw: string) => {
    const handle = raw.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    set('handle')(handle);
    setHandleState(null);
    clearTimeout(handleTimer.current);
    if (handle.length >= 3) {
      handleTimer.current = setTimeout(() => {
        api<{ available: boolean; reason: string | null }>(`/auth/handle-available?handle=${encodeURIComponent(handle)}`)
          .then(setHandleState)
          .catch(() => {});
      }, 350);
    }
  };

  // Suggest a username from the email the first time.
  const suggestHandle = () => {
    if (form.handle) return;
    const local = splitEmail(form.email, domain).local.replace(/[^a-z0-9_.]/g, '');
    if (local) onHandle(local.replace(/\./g, '_').slice(0, 20));
  };

  const savePending = (email: string | null) => {
    setPendingEmail(email);
    (email ? AsyncStorage.setItem(PENDING_KEY, email) : AsyncStorage.removeItem(PENDING_KEY)).catch(() => {});
  };

  const register = async () => {
    const { local, wrongDomain } = splitEmail(form.email, domain);
    if (wrongDomain || !local) return setError({ message: `Use your @${domain} school email.` });
    setBusy(true);
    setError(null);
    try {
      const { email } = await post<{ email: string }>('/auth/register', { ...form, email: `${local}@${domain}` });
      savePending(email);
      setCode('');
      startCooldown();
    } catch (err) {
      setError(err as Error);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (!pendingEmail || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await post<{ user: Me }>('/auth/verify', { email: pendingEmail, code: value });
      AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
      setUser(user);
    } catch (err) {
      setError(err as Error);
      setBusy(false);
      const codeName = err instanceof ApiError ? err.code : undefined;
      if (codeName === 'handle_taken' || codeName === 'no_pending' || codeName === 'email_taken') savePending(null);
    }
  };

  const resend = async () => {
    if (!pendingEmail) return;
    setError(null);
    try {
      await post('/auth/resend', { email: pendingEmail });
      startCooldown();
    } catch (err) {
      setError(err as Error);
      if (err instanceof ApiError && err.code === 'no_pending') savePending(null);
    }
  };

  if (pendingEmail) {
    return (
      <AuthScreen>
        <AuthCard icon={MailCheck} title="Check your inbox" lead={<>We sent a 6-digit code to <Span w={700} color="text">{pendingEmail}</Span>. It expires in 15 minutes.</>}>
          {error && <FormMessage>{error.message}</FormMessage>}
          <CodeInput
            value={code}
            label="Verification code"
            onChange={(v) => {
              setCode(v);
              // The code is the only field, so go as soon as it's complete.
              if (v.length === 6) verify(v);
            }}
          />
          <Button title="Verify & join" size="lg" block loading={busy} disabled={code.length !== 6} onPress={() => verify()} />
          <Text size={14} color="muted" center>
            Didn’t get it? Check spam, or{' '}
            {cooldown > 0 ? `resend in ${cooldown}s` : <Span w={700} color="greenDeep" onPress={resend}>send a new code</Span>}
          </Text>
          <Pressable onPress={() => { setError(null); savePending(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' }} hitSlop={8}>
            <ArrowLeft size={16} color={c.muted} />
            <Text w={600} size={14} color="muted">Use a different email</Text>
          </Pressable>
        </AuthCard>
      </AuthScreen>
    );
  }

  const handleHint = handleState ? (handleState.available ? `@${form.handle} is available` : handleState.reason) : undefined;
  const canSubmit = form.email.trim() && form.displayName.trim() && form.handle.length >= 3 && form.password.length >= 8
    && handleState?.available !== false && (form.role === 'teacher' || form.className);

  return (
    <AuthScreen>
      <AuthCard title="Create your account" lead="EdSpace is only for EdVille — we’ll confirm your school email.">
        {error && <FormMessage>{error.message}</FormMessage>}
        <RolePicker role={form.role} onChange={set('role')} />
        <EmailField value={form.email} onChange={set('email')} />
        <Field label="Your name">
          <Input
            value={form.displayName}
            onChangeText={set('displayName')}
            onFocus={suggestHandle}
            maxLength={50}
            autoComplete="name"
            textContentType="name"
            placeholder="First and last name"
            accessibilityLabel="Your name"
          />
        </Field>
        <Field label="Username" hint={handleHint ?? undefined} hintTone={handleState?.available ? 'ok' : 'error'}>
          <InputGroup
            prefix={<AtSign size={16} color={c.muted} />}
            value={form.handle}
            onChangeText={onHandle}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            accessibilityLabel="Username"
          />
        </Field>
        <PlacementField
          role={form.role}
          className={form.className}
          timetableTeacher={form.timetableTeacher}
          onClass={set('className')}
          onTimetable={set('timetableTeacher')}
        />
        {form.role === 'teacher' && (
          <FormMessage tone="note">
            You can post straight away. A moderator confirms teacher accounts before the <Span w={700}>Teacher</Span> badge appears on your profile.
          </FormMessage>
        )}
        <Field label="Password">
          <PasswordInput
            value={form.password}
            onChangeText={set('password')}
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="At least 8 characters"
            accessibilityLabel="Password"
          />
        </Field>
        <Button title="Continue" size="lg" block loading={busy} disabled={!canSubmit} onPress={register} />
        <Text size={14} color="muted" center>
          Already on EdSpace? <Span w={700} color="greenDeep" onPress={() => router.replace('/login')}>Log in</Span>
        </Text>
      </AuthCard>
    </AuthScreen>
  );
}
