import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bookmark, Ellipsis, Flag, Heart, Link2, MessageCircle, Repeat2, Shapes, Share2, Trash2 } from 'lucide-react-native';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { api, del, errorMessage, mediaUrl, webUrl } from '@/lib/api';
import { compact, shortTime } from '@/lib/format';
import { clubHref, postHref, profileHref } from '@/lib/links';
import { getPost, markDeleted, putPost, usePost } from '@/lib/postStore';
import { feedKey, invalidateFeeds, queryClient } from '@/lib/queries';
import { useSession } from '@/lib/session';
import type { FeedItem, Post, PostImage } from '@/lib/types';
import { useColors } from '@/theme';
import { Avatar, ClassTag, ModTag } from './Avatar';
import { Lightbox } from './Lightbox';
import { RichText } from './RichText';
import { BottomSheet, useActionSheet } from './Sheet';
import { Input, Text } from './Text';
import { useToast } from './Toast';
import { Button } from './ui';

// ── Media ────────────────────────────────────────────────────────────────

export function Media({ images, style }: { images: PostImage[]; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const [open, setOpen] = useState<number | null>(null);
  if (!images?.length) return null;
  const list = images.slice(0, 4);
  const n = list.length;

  const tile = (img: PostImage, i: number, tileStyle: StyleProp<ViewStyle>) => (
    <Pressable key={img.url} onPress={() => setOpen(i)} style={[{ backgroundColor: c.hover, overflow: 'hidden' }, tileStyle]} accessibilityRole="imagebutton" accessibilityLabel={img.alt ? `Image: ${img.alt}` : 'Open image'}>
      <Image source={mediaUrl(img.url)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={img.url} />
    </Pressable>
  );

  let grid;
  if (n === 1) {
    const img = list[0];
    // Keep a single image near its natural shape, within sensible bounds.
    const ratio = img.width && img.height ? Math.min(2, Math.max(0.75, img.width / img.height)) : 4 / 3;
    grid = tile(img, 0, { width: '100%', aspectRatio: ratio, maxHeight: 520 });
  } else if (n === 2) {
    grid = <View style={[styles.row, { height: 200 }]}>{list.map((img, i) => tile(img, i, { flex: 1 }))}</View>;
  } else if (n === 3) {
    grid = (
      <View style={[styles.row, { height: 220 }]}>
        {tile(list[0], 0, { flex: 1 })}
        <View style={{ flex: 1, gap: 2 }}>{list.slice(1).map((img, i) => tile(img, i + 1, { flex: 1 }))}</View>
      </View>
    );
  } else {
    grid = (
      <View style={{ height: 220, gap: 2 }}>
        <View style={[styles.row, { flex: 1 }]}>{list.slice(0, 2).map((img, i) => tile(img, i, { flex: 1 }))}</View>
        <View style={[styles.row, { flex: 1 }]}>{list.slice(2).map((img, i) => tile(img, i + 2, { flex: 1 }))}</View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.media, { borderColor: c.border, backgroundColor: c.border }, style]}>{grid}</View>
      {open != null && <Lightbox images={images} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

// ── Actions ──────────────────────────────────────────────────────────────

type Toggle = 'like' | 'repost' | 'bookmark';
const FLAG = { like: 'liked', repost: 'reposted', bookmark: 'bookmarked' } as const;
const COUNT = { like: 'likes', repost: 'reposts', bookmark: null } as const;

export const sharePost = (post: Post) => {
  const url = webUrl(`/post/${post.id}`);
  Share.share(Platform.OS === 'ios' ? { url } : { message: url }).catch(() => {});
};

/** Like / repost / bookmark with optimistic updates, shared across screens. */
export function usePostActions(post: Post) {
  const toast = useToast();
  const router = useRouter();

  const toggle = async (kind: Toggle) => {
    const before = getPost(post.id) ?? post;
    const flag = FLAG[kind];
    const countKey = COUNT[kind];
    const on = !before.viewer[flag];
    if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    putPost({
      ...before,
      viewer: { ...before.viewer, [flag]: on },
      counts: countKey ? { ...before.counts, [countKey]: Math.max(0, before.counts[countKey] + (on ? 1 : -1)) } : before.counts,
    });
    try {
      const res = await api<{ post: Post | null }>(`/posts/${post.id}/${kind}`, { method: on ? 'POST' : 'DELETE' });
      if (res.post) putPost(res.post);
      if (kind === 'bookmark') {
        toast(on ? 'Saved to bookmarks' : 'Removed from bookmarks');
        queryClient.invalidateQueries({ queryKey: feedKey('/bookmarks'), refetchType: 'none' });
      }
      if (kind === 'repost' && on) toast('Reposted', 'success');
    } catch (err) {
      putPost(before);
      toast(errorMessage(err), 'error');
    }
  };

  return {
    like: () => toggle('like'),
    repost: () => toggle('repost'),
    bookmark: () => toggle('bookmark'),
    reply: () => router.push({ pathname: '/compose', params: { replyTo: String(post.id) } }),
    share: () => sharePost(post),
  };
}

export function PostActions({ post, big }: { post: Post; big?: boolean }) {
  const c = useColors();
  const actions = usePostActions(post);
  const size = big ? 22 : 18;
  const act = (
    label: string, Icon: typeof Heart, onPress: () => void, count: number | null, on = false, onColor = c.green, fill = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count != null ? `${label} (${count})` : label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.act, count == null && { minWidth: 0 }, pressed && { backgroundColor: c.hover }]}
    >
      <Icon size={size} color={on ? onColor : c.muted} fill={on && fill ? onColor : 'none'} strokeWidth={2} />
      {!big && count ? <Text size={13} color={on ? onColor : c.muted} style={{ fontVariant: ['tabular-nums'] }}>{compact(count)}</Text> : null}
    </Pressable>
  );
  return (
    <View style={[styles.actions, big && styles.actionsBig]}>
      {act('Reply', MessageCircle, actions.reply, post.counts.replies)}
      {act('Repost', Repeat2, actions.repost, post.counts.reposts, post.viewer.reposted)}
      {act('Like', Heart, actions.like, post.counts.likes, post.viewer.liked, c.like, true)}
      {act('Bookmark', Bookmark, actions.bookmark, null, post.viewer.bookmarked, c.green, true)}
      {act('Share', Share2, actions.share, null)}
    </View>
  );
}

// ── Menu & reporting ─────────────────────────────────────────────────────

/** Returns a function that opens the post's ••• menu. */
export function usePostMenu(post: Post, onDeleted?: (id: number) => void) {
  const { user } = useSession();
  const toast = useToast();
  const showSheet = useActionSheet();
  const report = useReportPost();
  const canDelete = Boolean(user && (user.id === post.author.id || user.isAdmin));

  const remove = () => {
    Alert.alert('Delete post?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del(`/posts/${post.id}`);
            markDeleted(post.id);
            onDeleted?.(post.id);
            invalidateFeeds();
            if (post.replyTo) queryClient.invalidateQueries({ queryKey: ['thread', post.replyTo.id] });
            toast('Post deleted');
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      },
    ]);
  };

  return () =>
    showSheet({
      options: [
        { label: 'Share post', icon: Share2, onPress: () => sharePost(post) },
        {
          label: 'Copy link',
          icon: Link2,
          onPress: () => Clipboard.setStringAsync(webUrl(`/post/${post.id}`)).then(() => toast('Link copied')),
        },
        ...(canDelete ? [{ label: 'Delete post', icon: Trash2, destructive: true, onPress: remove }] : []),
        ...(user && user.id !== post.author.id ? [{ label: 'Report post', icon: Flag, onPress: () => report(post) }] : []),
      ],
    });
}

// The report sheet lives once at the root, never inside a list row: a list's
// ScrollView would otherwise catch taps inside the sheet (touches travel the
// React tree, even out of a Modal) and swallow them to dismiss the keyboard.
const ReportContext = createContext<(post: Post) => void>(() => {});
const useReportPost = () => useContext(ReportContext);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [post, setPost] = useState<Post | null>(null);
  const [visible, setVisible] = useState(false);
  const open = useCallback((p: Post) => {
    setPost(p);
    setVisible(true);
  }, []);
  return (
    <ReportContext.Provider value={open}>
      {children}
      {post && <ReportSheet key={post.id} post={post} visible={visible} onClose={() => setVisible(false)} />}
    </ReportContext.Provider>
  );
}

const REASONS = ['Bullying or harassment', 'Spam', 'Inappropriate content', 'Sharing private information', 'Something else'];

function ReportSheet({ post, visible, onClose }: { post: Post; visible: boolean; onClose: () => void }) {
  const c = useColors();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api(`/posts/${post.id}/report`, { method: 'POST', body: { reason: [reason, details.trim()].filter(Boolean).join(' — ') } });
      toast('Thanks — moderators will take a look', 'success');
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Report post">
      <View style={{ paddingHorizontal: 20, gap: 14, paddingBottom: 8 }}>
        <Text size={14} color="muted">Reports go to EdSpace moderators. The author won’t see who reported them.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REASONS.map((r) => {
            const on = reason === r;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.chip, { borderColor: on ? c.green : c.borderStrong, backgroundColor: on ? c.greenSoft : c.surfaceRaised }]}
              >
                <Text w={600} size={14} color={on ? 'greenDeep' : 'text'}>{r}</Text>
              </Pressable>
            );
          })}
        </View>
        <Input
          value={details}
          onChangeText={setDetails}
          placeholder="Anything else moderators should know? (optional)"
          multiline
          maxLength={400}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <Button title="Send report" block size="lg" disabled={!reason} loading={busy} onPress={submit} />
      </View>
    </BottomSheet>
  );
}

// ── The card ─────────────────────────────────────────────────────────────

export function Tombstone({ children = 'This post was deleted.' }: { children?: string }) {
  const c = useColors();
  return (
    <View style={{ margin: 12, marginHorizontal: 16, padding: 14, borderRadius: 12, backgroundColor: c.hover }}>
      <Text size={14} color="muted">{children}</Text>
    </View>
  );
}

/** "Posted in <club>", opening the club. */
export function ClubContext({ club, style }: { club: NonNullable<Post['club']>; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(clubHref(club.id))} style={[styles.context, style]} hitSlop={4} accessibilityRole="link" accessibilityLabel={`Posted in ${club.name}`}>
      <Shapes size={15} color={c.muted} />
      <Text w={600} size={13} color="muted" numberOfLines={1}>{club.name}</Text>
    </Pressable>
  );
}

export function PostCard({ post: initial, repostedBy, threadLine, borderless, onDeleted, showDeleted, hideClub }: {
  post: Post;
  repostedBy?: FeedItem['repostedBy'];
  /** Draws the line that joins a post to the reply below it. */
  threadLine?: boolean;
  borderless?: boolean;
  onDeleted?: (id: number) => void;
  /** Show a tombstone for deleted posts instead of hiding them. */
  showDeleted?: boolean;
  hideClub?: boolean;
}) {
  const c = useColors();
  const router = useRouter();
  const post = usePost(initial);
  const openMenu = usePostMenu(post, onDeleted);
  if (post.deleted) return showDeleted ? <Tombstone /> : null;
  const a = post.author;

  return (
    <Pressable
      onPress={() => router.push(postHref(post.id))}
      onLongPress={openMenu}
      style={({ pressed }) => [styles.card, { borderBottomColor: threadLine || borderless ? 'transparent' : c.border }, pressed && { backgroundColor: c.hover }]}
      accessibilityHint="Opens the post"
    >
      {repostedBy && (
        <Pressable onPress={() => router.push(profileHref(repostedBy.handle))} style={styles.context} hitSlop={4}>
          <Repeat2 size={15} color={c.muted} />
          <Text w={600} size={13} color="muted" numberOfLines={1}>{repostedBy.displayName} reposted</Text>
        </Pressable>
      )}
      {post.club && !hideClub && <ClubContext club={post.club} />}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 44 }}>
          <Avatar user={a} />
          {threadLine && <View style={[styles.threadLine, { backgroundColor: c.borderStrong }]} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <View style={styles.head}>
            <Text w={700} numberOfLines={1} style={{ flexShrink: 1 }} onPress={() => router.push(profileHref(a.handle))}>{a.displayName}</Text>
            <ModTag user={a} />
            <ClassTag user={a} />
            <Text color="muted" numberOfLines={1} style={{ flexShrink: 2 }}>@{a.handle}</Text>
            <Text color="muted">·</Text>
            <Text color="muted" style={{ flexShrink: 0 }}>{shortTime(post.createdAt)}</Text>
            <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="More options" style={{ marginLeft: 'auto', paddingLeft: 6 }}>
              <Ellipsis size={18} color={c.muted} />
            </Pressable>
          </View>
          {post.replyTo && (
            <Text size={14} color="muted">
              Replying to{' '}
              {post.replyTo.handle ? (
                <Text size={14} w={600} color="greenDeep" onPress={() => router.push(profileHref(post.replyTo!.handle!))}>@{post.replyTo.handle}</Text>
              ) : 'a deleted post'}
            </Text>
          )}
          {post.text ? <RichText text={post.text} size={15.5} style={{ marginTop: 2 }} /> : null}
          <Media images={post.images} style={{ marginTop: 10 }} />
          <PostActions post={post} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 12, paddingBottom: 4, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  context: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 26, marginBottom: 4, marginTop: -2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  threadLine: { position: 'absolute', left: 21, top: 50, bottom: -12, width: 2, borderRadius: 1 },
  media: { borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 2 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', maxWidth: 440, marginTop: 2, marginLeft: -8 },
  actionsBig: { maxWidth: undefined, marginLeft: 0, justifyContent: 'space-around', paddingVertical: 4 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, minWidth: 54 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5 },
});
