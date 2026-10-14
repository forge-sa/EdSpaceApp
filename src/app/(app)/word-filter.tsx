import { useQuery } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Input, Span, Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, ErrorState, Loading } from '@/components/ui';
import { api, del, errorMessage, post } from '@/lib/api';
import { queryClient, useRefresh } from '@/lib/queries';
import { useMe } from '@/lib/session';
import { useColors } from '@/theme';

interface FilterData {
  builtin: string[];
  words: { word: string; createdAt: number; addedBy: string | null }[];
}

const KEY = ['admin', 'filter'] as const;

/** Moderators: words the language filter blocks, on top of the built-in list. */
export default function WordFilter() {
  const me = useMe();
  if (!me.isAdmin) return <Redirect href="/" />;
  return <Filter />;
}

function Filter() {
  const c = useColors();
  const me = useMe();
  const toast = useToast();
  const query = useQuery({ queryKey: KEY, queryFn: () => api<FilterData>('/admin/filter') });
  const { refreshing, onRefresh } = useRefresh(query.refetch);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [showBuiltin, setShowBuiltin] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      const res = await post<{ word: string }>('/admin/filter', { word });
      queryClient.setQueryData<FilterData>(KEY, (d) => d && { ...d, words: [{ word: res.word, createdAt: Date.now(), addedBy: me.handle }, ...d.words] });
      setWord('');
      toast(`“${res.word}” is now blocked`, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (w: string) => {
    try {
      await del(`/admin/filter/${encodeURIComponent(w)}`);
      queryClient.setQueryData<FilterData>(KEY, (d) => d && { ...d, words: d.words.filter((x) => x.word !== w) });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
    >
      <Stack.Screen options={{ title: 'Language filter' }} />
      <Text size={14} color="muted">
        Posts, replies, poll options and bios containing these can’t be published. Add a whole word (<Span w={700} color="text">idiot</Span>), the
        start of words (<Span w={700} color="text">idiot*</Span> also blocks “idiots”), any word containing it (<Span w={700} color="text">*idiot*</Span>) or a
        phrase (<Span w={700} color="text">shut up</Span>).
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Input
          value={word}
          onChangeText={setWord}
          placeholder="Word to block"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => word.trim().length >= 2 && add()}
          accessibilityLabel="Word to block"
          style={{ flex: 1 }}
        />
        <Button title="Block" onPress={add} loading={busy} disabled={word.trim().length < 2} />
      </View>

      {query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : (
        <>
          <Text w={800} size={17}>Your words</Text>
          {query.data.words.length === 0 ? (
            <Text size={14} color="muted">You haven’t added any words yet.</Text>
          ) : (
            <View style={styles.chips}>
              {query.data.words.map((w) => (
                <View key={w.word} style={[styles.chip, { backgroundColor: c.hover }]}>
                  <Text w={600} size={14}>{w.word}</Text>
                  <Pressable onPress={() => remove(w.word)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Unblock ${w.word}`} style={styles.chipX}>
                    <X size={14} color={c.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable onPress={() => setShowBuiltin((s) => !s)} accessibilityRole="button" hitSlop={6}>
            <Text w={700} size={14} color="greenDeep">
              {showBuiltin ? 'Hide' : 'Show'} the built-in list ({query.data.builtin.length} English and Russian words)
            </Text>
          </Pressable>
          {showBuiltin && (
            <Text size={13} color="muted">
              {query.data.builtin.join(', ')}{'\n\n'}These are in server/src/wordfilter.js on the server.
            </Text>
          )}
        </>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, paddingRight: 4, paddingVertical: 4, borderRadius: 8 },
  chipX: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
});
