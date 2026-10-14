import { useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLUBS_KEY } from '@/components/Club';
import { ModalHeader } from '@/components/ModalHeader';
import { Input } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, Field, FormMessage } from '@/components/ui';
import { errorMessage, post } from '@/lib/api';
import { charCount } from '@/lib/format';
import { queryClient } from '@/lib/queries';
import { useMe } from '@/lib/session';
import type { Club } from '@/lib/types';
import { useColors } from '@/theme';

const NAME_MAX = 40;
const DESCRIPTION_MAX = 300;

export default function NewClub() {
  const c = useColors();
  const me = useMe();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const left = DESCRIPTION_MAX - charCount(description.trim());
  const canSend = !busy && name.trim().length >= 3 && description.trim().length > 0 && left >= 0;
  const dirty = !done && (name.trim().length > 0 || description.trim().length > 0);

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Discard this club?', 'What you wrote won’t be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Close once prevention is off (it reads `dirty` from the last render).
  useEffect(() => {
    if (done) router.back();
  }, [done, router]);

  const submit = async () => {
    if (!canSend) return;
    setBusy(true);
    try {
      const { club } = await post<{ club: Club }>('/clubs', { name, description });
      queryClient.invalidateQueries({ queryKey: CLUBS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast(club.status === 'approved' ? `${club.name} is open` : 'Sent — a moderator will review your club', 'success');
      setDone(true);
    } catch (err) {
      setBusy(false);
      Alert.alert('Couldn’t start the club', errorMessage(err));
    }
  };

  return (
    <>
      <ModalHeader
        title="Start a club"
        onCancel={() => router.back()}
        action={<Button title={me.isAdmin ? 'Create' : 'Send'} size="sm" onPress={submit} loading={busy} disabled={!canSend} />}
      />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: insets.bottom + 24 }}>
        <Field label="Name">
          <Input value={name} onChangeText={setName} maxLength={NAME_MAX} autoFocus placeholder="Chess Club" accessibilityLabel="Club name" />
        </Field>
        <Field label="What’s it about?" hint={String(left)} hintTone={left < 0 ? 'error' : undefined}>
          <Input
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="When you meet, what you do, who can join…"
            accessibilityLabel="Club description"
            style={{ minHeight: 110, textAlignVertical: 'top' }}
          />
        </Field>
        {!me.isAdmin && (
          <FormMessage tone="note">A moderator checks every new club before it shows up for everyone. You’ll get a notification when it’s approved.</FormMessage>
        )}
      </KeyboardAwareScrollView>
    </>
  );
}
