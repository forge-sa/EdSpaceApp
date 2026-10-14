import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/ModalHeader';
import { Input, Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, Field, FormMessage, InputGroup } from '@/components/ui';
import { errorMessage, patch, post } from '@/lib/api';
import { invalidateFeeds, queryClient } from '@/lib/queries';
import { useMe } from '@/lib/session';
import type { ParliamentKind, ParliamentRole } from '@/lib/types';
import { useColors } from '@/theme';

const SEAT_LABEL: Record<ParliamentKind, string> = { president: 'President', vice_president: 'Vice-President', minister: 'minister' };

/** Moderators: give someone a parliament role (?kind=…) or edit a minister (?id=…). */
export default function ParliamentRoleForm() {
  const me = useMe();
  if (!me.isAdmin) return <Redirect href="/parliament" />;
  return <RoleForm />;
}

function RoleForm() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { kind: kindParam, id } = useLocalSearchParams<{ kind?: ParliamentKind; id?: string }>();
  const editing = id ? queryClient.getQueryData<ParliamentRole[]>(['parliament'])?.find((r) => String(r.id) === id) ?? null : null;
  const kind: ParliamentKind = editing?.kind ?? (kindParam && kindParam in SEAT_LABEL ? kindParam : 'minister');
  const minister = kind === 'minister';

  const [handle, setHandle] = useState('');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [canPoll, setCanPoll] = useState(editing?.canPoll ?? false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const changed = editing ? title.trim() !== editing.title || canPoll !== editing.canPoll : handle.trim().length > 0 || title.trim().length > 0;
  const canSave = !busy && changed && (editing || handle.trim().length > 0) && (!minister || title.trim().length >= 3);

  usePreventRemove(!done && changed, ({ data }) => {
    Alert.alert('Discard changes?', 'Nothing will be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (done) router.back();
  }, [done, router]);

  const save = async () => {
    setBusy(true);
    try {
      if (editing) await patch(`/parliament/${editing.id}`, { title, canPoll });
      else await post('/parliament', { handle, kind, title, canPoll });
      // The role shows next to the person's name everywhere.
      queryClient.invalidateQueries({ queryKey: ['parliament'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      invalidateFeeds();
      toast(editing ? 'Saved' : 'Role given', 'success');
      setDone(true);
    } catch (err) {
      setBusy(false);
      Alert.alert('Couldn’t save', errorMessage(err));
    }
  };

  if (id && !editing) {
    return (
      <>
        <ModalHeader title="Parliament" onCancel={() => router.back()} />
        <View style={{ padding: 16 }}><FormMessage>That role was removed. Go back and refresh the list.</FormMessage></View>
      </>
    );
  }

  const heading = editing ? 'Edit minister' : minister ? 'Add minister' : `Assign ${SEAT_LABEL[kind]}`;
  return (
    <>
      <ModalHeader title={heading} onCancel={() => router.back()} action={<Button title="Save" size="sm" onPress={save} loading={busy} disabled={!canSave} />} />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: insets.bottom + 24 }}>
        {editing ? (
          <View>
            <Text w={700}>{editing.user.displayName}</Text>
            <Text color="muted">@{editing.user.handle}</Text>
          </View>
        ) : (
          <Field label="Username">
            <InputGroup
              prefix={<Text color="muted" w={600}>@</Text>}
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="username"
              accessibilityLabel="Username"
            />
          </Field>
        )}
        {minister ? (
          <>
            <Field label="Title">
              <Input value={title} onChangeText={setTitle} maxLength={60} placeholder="Minister of Sports" accessibilityLabel="Title" autoFocus={Boolean(editing)} />
            </Field>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text w={600}>Can make school polls</Text>
                <Text size={14} color="muted">Polls everyone at school can vote in.</Text>
              </View>
              <Switch value={canPoll} onValueChange={setCanPoll} trackColor={{ true: c.green, false: c.borderStrong }} thumbColor={c.surfaceRaised} accessibilityLabel="Can make school polls" />
            </View>
          </>
        ) : (
          <FormMessage tone="note">There is one {SEAT_LABEL[kind]}. They can always make school polls.</FormMessage>
        )}
        {!editing && <Text size={13} color="muted">Each person can hold one role. They’ll get a notification.</Text>}
      </KeyboardAwareScrollView>
    </>
  );
}
