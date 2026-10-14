import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ellipsis, MessageCircleOff } from 'lucide-react-native';
import { useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Avatar, ClassTag, ModTag } from '@/components/Avatar';
import { ComposePrompt } from '@/components/Feed';
import { ClubContext, Media, PostActions, PostCard, Tombstone, usePostMenu } from '@/components/PostCard';
import { RichText } from '@/components/RichText';
import { Span, Text } from '@/components/Text';
import { Empty, Loading } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { fullTime } from '@/lib/format';
import { profileHref } from '@/lib/links';
import { putPosts, usePost } from '@/lib/postStore';
import { useRefresh } from '@/lib/queries';
import type { Post } from '@/lib/types';
import { useColors } from '@/theme';

interface ThreadData {
  ancestors: Post[];
  post: Post;
  replies: Post[];
}

function FocusedPost({ post: initial }: { post: Post }) {
  const c = useColors();
  const router = useRouter();
  const post = usePost(initial);
  const openMenu = usePostMenu(post, () => router.canGoBack() && router.back());
  if (post.deleted) return <Tombstone />;
  const a = post.author;
  const stat = (n: number, one: string, many: string) =>
    n > 0 ? <Text size={14} color="muted"><Span w={700} color="text">{n}</Span> {n === 1 ? one : many}</Text> : null;

  return (
    <View style={[styles.focus, { borderBottomColor: c.border }]}>
      {post.club && <ClubContext club={post.club} style={{ marginLeft: 0, marginTop: 0, marginBottom: 10 }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar user={a} />
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => router.push(profileHref(a.handle))}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text w={700} numberOfLines={1} style={{ flexShrink: 1 }}>{a.displayName}</Text>
            <ModTag user={a} />
            <ClassTag user={a} />
          </View>
          <Text size={14} color="muted">@{a.handle}</Text>
        </Pressable>
        <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="More options">
          <Ellipsis size={20} color={c.muted} />
        </Pressable>
      </View>
      {post.replyTo && (
        <Text size={14} color="muted" style={{ marginTop: 10 }}>
          Replying to{' '}
          {post.replyTo.handle ? (
            <Span w={600} color="greenDeep" onPress={() => router.push(profileHref(post.replyTo!.handle!))}>@{post.replyTo.handle}</Span>
          ) : 'a deleted post'}
        </Text>
      )}
      {post.text ? <RichText text={post.text} size={18} style={{ marginTop: 12 }} selectable /> : null}
      <Media images={post.images} style={{ marginTop: 12 }} />
      <View style={[styles.line, { borderBottomColor: c.border }]}>
        <Text size={14} color="muted">{fullTime(post.createdAt)}</Text>
      </View>
      {(post.counts.replies > 0 || post.counts.reposts > 0 || post.counts.likes > 0) && (
        <View style={[styles.line, styles.stats, { borderBottomColor: c.border }]}>
          {stat(post.counts.replies, 'reply', 'replies')}
          {stat(post.counts.reposts, 'repost', 'reposts')}
          {stat(post.counts.likes, 'like', 'likes')}
        </View>
      )}
      <PostActions post={post} big />
    </View>
  );
}

export default function Thread() {
  const c = useColors();
  const { height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const list = useRef<FlatList<Post>>(null);
  const scrolled = useRef(false);

  const query = useQuery({
    queryKey: ['thread', postId],
    enabled: Number.isInteger(postId) && postId > 0,
    queryFn: async () => {
      const d = await api<ThreadData>(`/posts/${postId}`);
      putPosts([...d.ancestors, d.post, ...d.replies]);
      return d;
    },
  });
  const { refreshing, onRefresh } = useRefresh(query.refetch);

  if (query.isPending) return <><Stack.Screen options={{ title: 'Post' }} /><Loading /></>;
  if (query.isError) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Post' }} />
        <Empty icon={MessageCircleOff} title="Post not found">{errorMessage(query.error)}</Empty>
      </View>
    );
  }

  const data = query.data;
  return (
    <>
      <Stack.Screen options={{ title: 'Post' }} />
      <FlatList
        ref={list}
        data={data.replies}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
        ListHeaderComponent={
          <>
            {data.ancestors.map((p) => <PostCard key={p.id} post={p} threadLine showDeleted />)}
            {/* Bring the focused post into view once its ancestors render above it. */}
            <View
              onLayout={(e) => {
                if (scrolled.current || !data.ancestors.length) return;
                scrolled.current = true;
                list.current?.scrollToOffset({ offset: e.nativeEvent.layout.y, animated: false });
              }}
            >
              <FocusedPost post={data.post} />
            </View>
            {!data.post.deleted && <ComposePrompt replyTo={data.post.id} placeholder={`Reply to @${data.post.author.handle}`} />}
          </>
        }
        ListFooterComponent={<View style={{ height: data.ancestors.length ? height * 0.6 : 80 }} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  focus: { paddingTop: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  line: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  stats: { flexDirection: 'row', gap: 18 },
});
