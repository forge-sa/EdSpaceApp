import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { profileHref } from '@/lib/links';
import { invalidateFeeds, queryClient } from '@/lib/queries';
import { useSession } from '@/lib/session';
import type { ListUser, Profile, UserSummary } from '@/lib/types';
import { useColors } from '@/theme';
import { Avatar, ClassTag, ModTag } from './Avatar';
import { Text } from './Text';
import { useToast } from './Toast';
import { Button } from './ui';

export function FollowButton({ user: target, following: initial, onChange, small }: {
  user: Pick<UserSummary, 'id' | 'handle'>;
  following: boolean;
  onChange?: (p: Profile) => void;
  small?: boolean;
}) {
  const { user } = useSession();
  const toast = useToast();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (!user || user.id === target.id) return null;

  const run = async (next: boolean) => {
    setFollowing(next);
    setBusy(true);
    try {
      const res = await api<{ user: Profile }>(`/users/${target.handle}/follow`, { method: next ? 'POST' : 'DELETE' });
      onChange?.(res.user);
      queryClient.setQueryData(['profile', target.handle], res.user);
      // The Following feed changes with who you follow.
      invalidateFeeds();
    } catch (err) {
      setFollowing(!next);
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const unfollow = () =>
    Alert.alert(`Unfollow @${target.handle}?`, 'Their posts will no longer show up in your Following feed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unfollow', style: 'destructive', onPress: () => run(false) },
    ]);

  return following ? (
    <Button title="Following" variant="outline" size={small ? 'sm' : 'md'} onPress={unfollow} disabled={busy} />
  ) : (
    <Button title="Follow" variant="dark" size={small ? 'sm' : 'md'} onPress={() => run(true)} disabled={busy} />
  );
}

export function UserRow({ user, showBio = true }: { user: ListUser; showBio?: boolean }) {
  const c = useColors();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(profileHref(user.handle))}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.hover }]}
      accessibilityRole="link"
    >
      <Avatar user={user} link={false} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.line1}>
          <Text w={700} numberOfLines={1} style={{ flexShrink: 1 }}>{user.displayName}</Text>
          <ModTag user={user} />
          <ClassTag user={user} link={false} />
        </View>
        <Text size={14} color="muted" numberOfLines={1}>@{user.handle}</Text>
        {showBio && user.bio ? <Text size={14} numberOfLines={2} style={{ marginTop: 3 }}>{user.bio}</Text> : null}
      </View>
      <FollowButton user={user} following={user.viewer.following} small />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  line1: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
});
