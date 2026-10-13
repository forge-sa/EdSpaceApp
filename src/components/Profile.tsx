import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  BadgeCheck, CalendarDays, Ellipsis, GraduationCap, Hourglass, Link2, Presentation, Share2, Shield, ShieldOff, UserX,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
import { api, errorMessage, mediaUrl, post as apiPost, webUrl } from '@/lib/api';
import { joinedDate } from '@/lib/format';
import { classHref, openExternal } from '@/lib/links';
import { useMe } from '@/lib/session';
import type { Profile } from '@/lib/types';
import { useColors } from '@/theme';
import { Avatar, ModTag } from './Avatar';
import { FeedList } from './Feed';
import { RichText } from './RichText';
import { useActionSheet, type SheetOption } from './Sheet';
import { Span, Text } from './Text';
import { useToast } from './Toast';
import { Button, Empty, IconButton, Loading, Pill, Tabs } from './ui';
import { FollowButton } from './UserRow';

type Tab = 'posts' | 'replies' | 'media' | 'likes';

export const profileKey = (handle: string) => ['profile', handle] as const;

export function useProfile(handle: string) {
  return useQuery({ queryKey: profileKey(handle), queryFn: () => api<{ user: Profile }>(`/users/${handle}`).then((d) => d.user) });
}

/** The green banner with the website's soft circle and stripes. */
function DefaultBanner() {
  const c = useColors();
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 300 100">
      <Defs>
        <Pattern id="stripes" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1="0" y1="0" x2="0" y2="26" stroke="#fff" strokeOpacity="0.05" strokeWidth="26" />
        </Pattern>
      </Defs>
      <Rect width="300" height="100" fill={c.green} />
      <Rect width="300" height="100" fill="url(#stripes)" />
      <Circle cx="255" cy="20" r="34" fill={c.greenInk} fillOpacity="0.22" />
    </Svg>
  );
}

function ProfileHeader({ p, tab, setTab }: { p: Profile; tab: Tab; setTab: (t: Tab) => void }) {
  const c = useColors();
  const me = useMe();
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const showSheet = useActionSheet();
  const isSelf = p.viewer.isSelf;
  const banner = mediaUrl(p.banner);

  const update = (next: Profile) => client.setQueryData(profileKey(p.handle), next);
  const reload = () => client.invalidateQueries({ queryKey: profileKey(p.handle) });

  const moderate = (title: string, message: string, confirm: string, path: string, done: string, destructive = false) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirm,
        style: destructive ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await apiPost(path);
            toast(done);
            reload();
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      },
    ]);

  const openMenu = () => {
    const url = webUrl(`/@${p.handle}`);
    const options: SheetOption[] = [
      { label: 'Share profile', icon: Share2, onPress: () => Share.share(Platform.OS === 'ios' ? { url } : { message: url }).catch(() => {}) },
      { label: 'Copy link', icon: Link2, onPress: () => Clipboard.setStringAsync(url).then(() => toast('Link copied')) },
    ];
    if (me.isAdmin && !isSelf) {
      if (p.role === 'teacher') {
        options.push(p.isTeacher
          ? { label: 'Remove Teacher badge', icon: ShieldOff, onPress: () => moderate('Remove badge?', `Remove @${p.handle}’s Teacher badge?`, 'Remove', `/admin/teachers/${p.handle}/decline`, 'Teacher badge removed', true) }
          : { label: 'Approve teacher', icon: BadgeCheck, onPress: () => moderate('Approve teacher?', `Give @${p.handle} the Teacher badge?`, 'Approve', `/admin/teachers/${p.handle}/approve`, 'Teacher approved') });
      }
      options.push(p.isBanned
        ? { label: 'Restore account', icon: Shield, onPress: () => moderate('Restore account?', `Restore @${p.handle}?`, 'Restore', `/admin/users/${p.handle}/unban`, 'Account restored') }
        : { label: 'Suspend account', icon: Shield, destructive: true, onPress: () => moderate('Suspend account?', `Suspend @${p.handle}? They’ll be logged out and their posts hidden.`, 'Suspend', `/admin/users/${p.handle}/ban`, 'Account suspended', true) });
    }
    showSheet({ title: `@${p.handle}`, options });
  };

  const tabs = [
    { id: 'posts' as const, label: 'Posts' },
    { id: 'replies' as const, label: 'Replies' },
    { id: 'media' as const, label: 'Media' },
    ...(isSelf ? [{ id: 'likes' as const, label: 'Likes' }] : []),
  ];

  return (
    <View>
      <View style={{ aspectRatio: 3, backgroundColor: c.green, overflow: 'hidden' }}>
        {banner ? <Image source={banner} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <DefaultBanner />}
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={styles.topRow}>
          <Avatar user={p} size={88} link={false} ring={4} style={{ marginTop: -44 }} />
          <View style={styles.actions}>
            <IconButton icon={Ellipsis} label="More options" onPress={openMenu} style={[styles.round, { borderColor: c.borderStrong }]} size={18} />
            {isSelf ? (
              <Button title="Edit profile" variant="outline" onPress={() => router.push('/edit-profile')} />
            ) : (
              <FollowButton key={String(p.viewer.following)} user={p} following={p.viewer.following} onChange={update} />
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Text w={800} size={22} style={{ flexShrink: 1 }}>{p.displayName}</Text>
          <ModTag user={p} size={19} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text color="muted">@{p.handle}</Text>
          {p.viewer.followsYou && <Pill>Follows you</Pill>}
          {p.isBanned && <Pill color="danger">Suspended</Pill>}
        </View>
        {p.bio ? <RichText text={p.bio} style={{ marginTop: 12 }} /> : null}

        <View style={styles.meta}>
          {p.role === 'teacher' ? (
            p.isTeacher ? (
              <Pressable onPress={() => router.push('/teachers')} style={[styles.ribbon, { backgroundColor: c.text }]} accessibilityRole="link">
                <Presentation size={15} color={c.surface} />
                <Text w={800} size={13} color={c.surface}>Teacher</Text>
              </Pressable>
            ) : (isSelf || me.isAdmin) ? (
              <Pill icon={Hourglass}>{isSelf && me.teacherStatus === 'declined' ? 'Teacher badge not approved' : 'Teacher — waiting for moderator approval'}</Pill>
            ) : null
          ) : p.className ? (
            <Pressable onPress={() => p.classSlug && router.push(classHref(p.classSlug))} style={[styles.ribbon, { backgroundColor: c.green }]} accessibilityRole="link">
              <GraduationCap size={15} color={c.greenInk} />
              <Text w={800} size={13} color="greenInk">Class {p.className}</Text>
            </Pressable>
          ) : null}
          {p.timetableUrl ? (
            <Pressable onPress={() => openExternal(p.timetableUrl!)} style={styles.metaItem} accessibilityRole="link" hitSlop={6}>
              <CalendarDays size={15} color={c.greenDeep} />
              <Text w={600} size={14} color="greenDeep">Timetable</Text>
            </Pressable>
          ) : null}
          <View style={styles.metaItem}>
            <CalendarDays size={15} color={c.muted} />
            <Text size={14} color="muted">Joined {joinedDate(p.createdAt)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
          <Text size={14} color="muted" onPress={() => router.push(`/@${p.handle}/following`)} accessibilityRole="link">
            <Span w={700} color="text">{p.counts.following}</Span> Following
          </Text>
          <Text size={14} color="muted" onPress={() => router.push(`/@${p.handle}/followers`)} accessibilityRole="link">
            <Span w={700} color="text">{p.counts.followers}</Span> {p.counts.followers === 1 ? 'Follower' : 'Followers'}
          </Text>
        </View>
      </View>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
    </View>
  );
}

export function ProfileView({ handle }: { handle: string }) {
  const query = useProfile(handle);
  const [tab, setTab] = useState<Tab>('posts');

  if (query.isPending) return <Loading />;
  if (query.isError) return <Empty icon={UserX} title="This account doesn’t exist">{errorMessage(query.error)}</Empty>;

  const p = query.data;
  const endpoint = `/users/${p.handle}/${tab}`;
  return (
    <FeedList
      key={endpoint}
      endpoint={endpoint}
      header={<ProfileHeader p={p} tab={tab} setTab={setTab} />}
      onRefreshExtra={query.refetch}
      empty={
        <Empty title={tab === 'media' ? 'No photos yet' : tab === 'likes' ? 'No likes yet' : p.viewer.isSelf ? 'You haven’t posted yet' : `@${p.handle} hasn’t posted yet`}>
          {tab === 'likes' ? 'Posts you like will show up here. Only you can see this tab.' : null}
        </Empty>
      }
    />
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 52 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  round: { borderWidth: 1.5, borderRadius: 12 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 8, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ribbon: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingLeft: 8, paddingRight: 10, borderRadius: 7 },
});
