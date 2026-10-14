import { useRouter } from 'expo-router';
import { Check, Hourglass, Shapes } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { clubHref } from '@/lib/links';
import { invalidateFeeds, queryClient } from '@/lib/queries';
import type { Club, ListUser } from '@/lib/types';
import { useColors } from '@/theme';
import { Text } from './Text';
import { useToast } from './Toast';
import { Button, Pill } from './ui';

export interface ClubList {
  clubs: Club[];
  /** The viewer's own clubs that are waiting for a moderator or were declined. */
  requests: Club[];
}

export interface ClubData {
  club: Club;
  members: ListUser[];
}

export const CLUBS_KEY = ['clubs'] as const;
export const clubKey = (id: number | string) => ['club', String(id)] as const;

export const memberCount = (n: number) => `${n} ${n === 1 ? 'member' : 'members'}`;

/** Puts a club the server sent back into every cached copy, and reloads its member list. */
export function clubChanged(club: Club) {
  queryClient.setQueryData<ClubList>(CLUBS_KEY, (d) => d && { ...d, clubs: d.clubs.map((x) => (x.id === club.id ? club : x)) });
  queryClient.setQueryData<ClubData>(clubKey(club.id), (d) => d && { ...d, club });
  queryClient.invalidateQueries({ queryKey: clubKey(club.id) });
}

/** After a club is deleted. Its posts lose their club label, so feeds reload too. */
export function clubRemoved(id: number) {
  queryClient.setQueryData<ClubList>(CLUBS_KEY, (d) => d && { clubs: d.clubs.filter((x) => x.id !== id), requests: d.requests.filter((x) => x.id !== id) });
  queryClient.removeQueries({ queryKey: clubKey(id) });
  queryClient.invalidateQueries({ queryKey: ['classes'] });
  invalidateFeeds();
}

export function ClubBadge({ size = 44 }: { size?: number }) {
  const c = useColors();
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.greenSoft }]}>
      <Shapes size={size / 2} color={c.greenDeep} />
    </View>
  );
}

export function ClubStatusPill({ club }: { club: Club }) {
  return club.status === 'pending'
    ? <Pill icon={Hourglass}>Waiting for a moderator</Pill>
    : <Pill color="danger">Not approved</Pill>;
}

/** Join, or Joined (asks before leaving). The founder can't leave, so gets no button. */
export function JoinButton({ club, small }: { club: Club; small?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (club.viewer.isOwner || club.status !== 'approved') return null;

  const run = async (join: boolean) => {
    setBusy(true);
    try {
      const res = await api<{ club: Club }>(`/clubs/${club.id}/join`, { method: join ? 'POST' : 'DELETE' });
      clubChanged(res.club);
      if (join) toast(`You joined ${club.name}`, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const leave = () =>
    Alert.alert(`Leave ${club.name}?`, 'You can join again any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => run(false) },
    ]);

  const size = small ? 'sm' : 'md';
  return club.viewer.isMember
    ? <Button title="Joined" icon={small ? undefined : Check} variant="outline" size={size} onPress={leave} loading={busy} style={!small && { alignSelf: 'flex-start' }} />
    : <Button title={small ? 'Join' : 'Join club'} variant="dark" size={size} onPress={() => run(true)} loading={busy} style={!small && { alignSelf: 'flex-start' }} />;
}

/** A club in a list: badge, name, description, and a button or status on the right. */
export function ClubRow({ club, meta, right }: { club: Club; meta?: ReactNode; right?: ReactNode }) {
  const c = useColors();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(clubHref(club.id))}
      accessibilityRole="link"
      accessibilityLabel={`${club.name}, ${memberCount(club.members)}`}
      style={({ pressed }) => [styles.row, { borderBottomColor: c.border }, pressed && { backgroundColor: c.hover }]}
    >
      <ClubBadge />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text w={700} numberOfLines={1}>{club.name}</Text>
        {club.description ? <Text size={14} numberOfLines={2}>{club.description}</Text> : null}
        {meta ? <View style={{ marginTop: 4, flexDirection: 'row' }}>{meta}</View> : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
