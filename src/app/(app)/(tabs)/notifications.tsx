import { useInfiniteQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter, useScrollToTop, type Href } from 'expo-router';
import { BadgeCheck, Bell, Heart, Repeat2, UserPlus, type LucideIcon } from 'lucide-react-native';
import { useCallback, useMemo, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { PostCard } from '@/components/PostCard';
import { Span, Text } from '@/components/Text';
import { Empty, ErrorState, Loading } from '@/components/ui';
import { api, errorMessage, post } from '@/lib/api';
import { shortTime } from '@/lib/format';
import { postHref, profileHref } from '@/lib/links';
import { putPosts } from '@/lib/postStore';
import { useRefresh } from '@/lib/queries';
import { useSession } from '@/lib/session';
import type { Notification } from '@/lib/types';
import { useColors } from '@/theme';

const ICONS: Record<string, LucideIcon> = { like: Heart, repost: Repeat2, follow: UserPlus, teacher_approved: BadgeCheck };
const VERB: Record<string, string> = {
  like: 'liked your post',
  repost: 'reposted your post',
  follow: 'followed you',
  teacher_approved: 'confirmed your teacher account — you now have the Teacher badge',
};

interface Page {
  items: Notification[];
  cursor: string | null;
}

export default function Notifications() {
  const c = useColors();
  const router = useRouter();
  const { unread, setUnread } = useSession();
  const list = useRef<FlatList<Notification>>(null);
  useScrollToTop(list);

  const query = useInfiniteQuery({
    queryKey: ['notifications'],
    initialPageParam: null as string | null,
    getNextPageParam: (last: Page) => last.cursor,
    queryFn: async ({ pageParam, signal }) => {
      const page = await api<Page>(`/notifications${pageParam ? `?cursor=${pageParam}` : ''}`, { signal });
      putPosts(page.items.map((n) => n.post));
      return page;
    },
  });
  const { refreshing, onRefresh } = useRefresh(query.refetch);
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  // Coming back to the tab with a badge showing: fetch what's new.
  const badge = unread > 0;
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (badge) refetch();
    }, [badge, refetch]),
  );

  // Everything on screen counts as seen.
  const hasUnread = items.some((n) => !n.read);
  useFocusEffect(
    useCallback(() => {
      if (hasUnread) post('/notifications/read').then(() => setUnread(0)).catch(() => {});
      else if (query.isSuccess) setUnread(0);
    }, [hasUnread, query.isSuccess, setUnread]),
  );

  return (
    <FlatList
      ref={list}
      data={items}
      keyExtractor={(n) => String(n.id)}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      onEndReachedThreshold={1.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
      ListEmptyComponent={
        query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : (
          <Empty icon={Bell} title="Nothing yet">When classmates like, repost, reply to or mention you, you’ll see it here.</Empty>
        )
      }
      ListFooterComponent={query.isFetchingNextPage ? <Loading /> : <View style={{ height: 40 }} />}
      renderItem={({ item: n }) => {
        const unreadBg = n.read ? undefined : { backgroundColor: c.greenSoft + '73' };
        // Replies and mentions are shown as the post itself.
        if ((n.type === 'reply' || n.type === 'mention') && n.post) {
          return <View style={unreadBg}><PostCard post={n.post} /></View>;
        }
        const Icon = ICONS[n.type] ?? Bell;
        const target: Href = n.type === 'follow' ? profileHref(n.actor.handle) : n.type === 'teacher_approved' ? '/teachers' : postHref(n.post?.id ?? 0);
        const color = n.type === 'like' ? c.like : c.green;
        return (
          <Pressable
            onPress={() => router.push(target)}
            style={({ pressed }) => [styles.row, { borderBottomColor: c.border }, unreadBg, pressed && { backgroundColor: c.hover }]}
          >
            <View style={{ width: 44, alignItems: 'flex-end', paddingTop: 2 }}>
              <Icon size={26} color={color} fill={n.type === 'like' ? color : 'none'} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Avatar user={n.actor} size={34} />
              <Text>
                <Span w={700}>{n.actor.displayName}</Span> {VERB[n.type] ?? ''}
                <Span color="muted"> · {shortTime(n.createdAt)}</Span>
              </Text>
              {n.post && (n.post.text || n.post.images.length > 0) ? (
                <Text color="muted" numberOfLines={3}>{n.post.text || '🖼 Image'}</Text>
              ) : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
