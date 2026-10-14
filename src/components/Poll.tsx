import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, errorMessage, post as apiPost } from '@/lib/api';
import { profileHref } from '@/lib/links';
import { putPost } from '@/lib/postStore';
import { useSession } from '@/lib/session';
import type { ListUser, Post } from '@/lib/types';
import { useColors } from '@/theme';
import { Avatar, ClassTag } from './Avatar';
import { BottomSheet } from './Sheet';
import { Input, Text } from './Text';
import { useToast } from './Toast';
import { IconButton, Loading, Segmented } from './ui';

type Option = NonNullable<Post['poll']>['options'][number];

/**
 * A post's poll: answer buttons until you vote (or when you can't), then the
 * results. In a public poll, tapping a result lists who picked it.
 */
export function Poll({ post }: { post: Post }) {
  const c = useColors();
  const toast = useToast();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [voters, setVoters] = useState<Option | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const poll = post.poll!;

  const vote = async (o: Option) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiPost<{ post: Post }>(`/posts/${post.id}/vote`, { option: o.id });
      putPost(res.post);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const top = Math.max(...poll.options.map((o) => o.votes));
  const note = user && poll.voted == null && post.club && !poll.canVote ? ` · Only members of ${post.club.name} can vote` : '';

  return (
    // Swallows taps so they don't open the post.
    <Pressable style={styles.poll} onPress={() => {}}>
      {poll.options.map((o) => {
        if (poll.canVote) {
          return (
            <Pressable
              key={o.id}
              onPress={() => vote(o)}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.option, { borderColor: c.green }, pressed && { backgroundColor: c.greenSoft }]}
            >
              <Text w={700} color="greenDeep" center>{o.text}</Text>
            </Pressable>
          );
        }
        const pct = poll.total ? Math.round((o.votes * 100) / poll.total) : 0;
        const lead = poll.total > 0 && o.votes === top;
        const mine = poll.voted === o.id;
        const open = !poll.anonymous && o.votes > 0;
        return (
          <Pressable
            key={o.id}
            disabled={!open}
            onPress={() => {
              setVoters(o);
              setSheetOpen(true);
            }}
            accessibilityRole={open ? 'button' : 'text'}
            accessibilityLabel={`${o.text}, ${pct}%${mine ? ', your vote' : ''}`}
            style={[styles.result, { backgroundColor: c.hover }]}
          >
            <View style={[StyleSheet.absoluteFill, { width: `${pct}%`, backgroundColor: lead ? c.greenSoft : c.border }]} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Text w={lead ? 800 : 600} numberOfLines={2} style={{ flexShrink: 1 }}>{o.text}</Text>
              {mine && <Check size={15} color={c.green} />}
            </View>
            <Text w={700} style={{ fontVariant: ['tabular-nums'] }}>{pct}%</Text>
          </Pressable>
        );
      })}
      <Text size={13} color="muted">
        {poll.total} {poll.total === 1 ? 'vote' : 'votes'} · {poll.anonymous ? 'Anonymous' : 'Public — everyone can see who voted for what'}{note}
      </Text>
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} onClosed={() => setVoters(null)} title={voters ? `Voted “${voters.text}”` : undefined}>
        {voters && <Voters postId={post.id} option={voters} onOpen={() => setSheetOpen(false)} />}
      </BottomSheet>
    </Pressable>
  );
}

function Voters({ postId, option, onOpen }: { postId: number; option: Option; onOpen: () => void }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['poll-voters', postId, option.id],
    queryFn: () => api<{ users: ListUser[] }>(`/posts/${postId}/poll/voters?option=${option.id}`).then((d) => d.users),
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <Text color="muted" style={{ padding: 20 }}>{errorMessage(query.error)}</Text>;
  return (
    <ScrollView>
      {query.data.map((u) => (
        <Pressable
          key={u.id}
          onPress={() => {
            onOpen();
            router.push(profileHref(u.handle));
          }}
          style={styles.voter}
          accessibilityRole="link"
        >
          <Avatar user={u} size={36} link={false} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text w={700} numberOfLines={1} style={{ flexShrink: 1 }}>{u.displayName}</Text>
              <ClassTag user={u} link={false} />
            </View>
            <Text size={14} color="muted">@{u.handle}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export interface PollDraft {
  options: string[];
  anonymous: boolean;
}

/** Poll options and the anonymous/public choice, inside the composer. */
export function PollEditor({ poll, onChange, max = 6, maxLength = 60 }: {
  poll: PollDraft;
  onChange: (p: PollDraft) => void;
  max?: number;
  maxLength?: number;
}) {
  const c = useColors();
  const setOption = (i: number, text: string) => onChange({ ...poll, options: poll.options.map((o, j) => (j === i ? text : o)) });
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      {poll.options.map((o, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Input
            value={o}
            onChangeText={(t) => setOption(i, t)}
            maxLength={maxLength}
            placeholder={`Option ${i + 1}`}
            accessibilityLabel={`Option ${i + 1}`}
            style={{ flex: 1, paddingVertical: 9, fontSize: 15 }}
          />
          {poll.options.length > 2 && (
            <IconButton icon={X} label={`Remove option ${i + 1}`} color={c.muted} size={18} onPress={() => onChange({ ...poll, options: poll.options.filter((_, j) => j !== i) })} />
          )}
        </View>
      ))}
      {poll.options.length < max && (
        <Pressable onPress={() => onChange({ ...poll, options: [...poll.options, ''] })} style={styles.addOption} accessibilityRole="button" hitSlop={6}>
          <Plus size={16} color={c.greenDeep} />
          <Text w={700} size={14} color="greenDeep">Add option</Text>
        </Pressable>
      )}
      <Segmented
        options={[{ id: 'anonymous', label: 'Anonymous' }, { id: 'public', label: 'Public' }]}
        value={poll.anonymous ? 'anonymous' : 'public'}
        onChange={(v) => onChange({ ...poll, anonymous: v === 'anonymous' })}
      />
      <Text size={13} color="muted">
        {poll.anonymous ? 'Nobody sees who voted for what — only the totals.' : 'Everyone can see who voted for each option.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  poll: { gap: 6, marginTop: 10 },
  option: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minHeight: 38, overflow: 'hidden' },
  voter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 20 },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
});
