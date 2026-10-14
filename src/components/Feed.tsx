import { useRouter } from 'expo-router';
import { PenLine } from 'lucide-react-native';
import type { ReactElement, ReactNode, Ref } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, type FlatListProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '@/lib/api';
import { useFeed } from '@/lib/queries';
import { useMe } from '@/lib/session';
import type { FeedItem } from '@/lib/types';
import { useColors } from '@/theme';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { Text } from './Text';
import { ErrorState, Loading, shadow } from './ui';

/** Footer space so the last post clears the compose button. */
export const FAB_CLEARANCE = 96;

/**
 * A paginated, pull-to-refresh list of posts from a feed endpoint.
 * Mount with key={endpoint} when the endpoint changes.
 */
export function FeedList({ endpoint, header, empty, enabled = true, ref, onRefreshExtra, hideClub, ...listProps }: {
  endpoint: string;
  header?: ReactElement | null;
  empty?: ReactNode;
  enabled?: boolean;
  ref?: Ref<FlatList<FeedItem>>;
  /** Also reloaded on pull-to-refresh (e.g. the profile above the posts). */
  onRefreshExtra?: () => Promise<unknown>;
  /** Leave the club label off posts (on a club's own feed). */
  hideClub?: boolean;
} & Partial<Omit<FlatListProps<FeedItem>, 'data' | 'renderItem'>>) {
  const c = useColors();
  const feed = useFeed(endpoint, enabled, onRefreshExtra);
  return (
    <FlatList
      ref={ref}
      data={feed.items}
      keyExtractor={(i) => i.key}
      renderItem={({ item }) => <PostCard post={item.post} repostedBy={item.repostedBy} hideClub={hideClub} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        feed.isPending ? <Loading /> : feed.isError ? <ErrorState message={errorMessage(feed.error)} onRetry={() => feed.refetch()} /> : <>{empty}</>
      }
      ListFooterComponent={
        <View style={{ minHeight: FAB_CLEARANCE }}>
          {feed.isFetchingNextPage && <Loading />}
          {feed.isError && feed.items.length > 0 && (
            <Pressable onPress={() => feed.fetchNextPage()} style={{ padding: 16 }}>
              <Text w={600} color="greenDeep" center>Couldn’t load more — try again</Text>
            </Pressable>
          )}
        </View>
      }
      onEndReached={feed.loadMore}
      onEndReachedThreshold={1.5}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.onRefresh} tintColor={c.green} colors={[c.green]} progressBackgroundColor={c.surfaceRaised} />}
      style={{ backgroundColor: c.surface }}
      contentInsetAdjustmentBehavior="automatic"
      {...listProps}
    />
  );
}

/** Avatar + "What's happening at school?" — opens the composer (for a reply, or a post in a club). */
export function ComposePrompt({ placeholder = 'What’s happening at school?', replyTo, club }: {
  placeholder?: string;
  replyTo?: number;
  /** `isOwner`: the club's founder, who may also start polls there. */
  club?: { id: number; name: string; viewer?: { isOwner: boolean } };
}) {
  const c = useColors();
  const router = useRouter();
  const me = useMe();
  const params = replyTo
    ? { replyTo: String(replyTo) }
    : club ? { club: String(club.id), clubName: club.name, ...(club.viewer?.isOwner ? { clubOwner: '1' } : {}) } : null;
  return (
    <Pressable
      onPress={() => router.push(params ? { pathname: '/compose', params } : '/compose')}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
      style={[styles.prompt, { borderBottomColor: c.border }]}
    >
      <Avatar user={me} link={false} size={40} />
      <View style={[styles.promptField, { backgroundColor: c.hover }]}>
        <Text size={16} color="faint" numberOfLines={1}>{placeholder}</Text>
      </View>
    </Pressable>
  );
}

/** The floating "new post" button. */
export function ComposeFab() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => router.push('/compose')}
      accessibilityRole="button"
      accessibilityLabel="New post"
      style={({ pressed }) => [
        styles.fab,
        shadow(c.shadow, 0.22, 14, 6),
        { backgroundColor: pressed ? c.greenHover : c.green, bottom: 16, right: 16 + insets.right },
      ]}
    >
      <PenLine size={24} color={c.greenInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  promptField: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  fab: { position: 'absolute', width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
