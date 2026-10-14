import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Ellipsis, Shapes, Trash2, UserPlus } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { clubKey, clubRemoved, JoinButton, memberCount, type ClubData } from '@/components/Club';
import { ComposePrompt } from '@/components/Feed';
import { GroupHero, GroupScreen } from '@/components/Group';
import { useActionSheet } from '@/components/Sheet';
import { Span, Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Empty, IconButton, Loading, Notice } from '@/components/ui';
import { api, del, errorMessage } from '@/lib/api';
import { clubRequestsHref, profileHref } from '@/lib/links';
import { useMe } from '@/lib/session';
import { useColors } from '@/theme';

export default function ClubPage() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const me = useMe();
  const router = useRouter();
  const toast = useToast();
  const showSheet = useActionSheet();
  const fetchClub = () => api<ClubData>(`/clubs/${encodeURIComponent(id)}`);
  const query = useQuery({ queryKey: clubKey(id), queryFn: fetchClub });
  // Same cache entry, viewed as the member list.
  const members = useQuery({ queryKey: clubKey(id), queryFn: fetchClub, select: (d) => d.members });

  if (query.isPending) return <><Stack.Screen options={{ title: 'Club' }} /><Loading /></>;
  if (query.isError) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Club' }} />
        <Empty icon={Shapes} title="Club not found">{errorMessage(query.error)}</Empty>
      </View>
    );
  }

  const { club } = query.data;
  const open = club.status === 'approved';

  const remove = () =>
    Alert.alert(`Delete ${club.name}?`, 'Its posts stay on EdSpace but won’t belong to a club any more.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del(`/clubs/${club.id}`);
            clubRemoved(club.id);
            toast('Club deleted');
            if (router.canGoBack()) router.back();
            else router.replace('/clubs');
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      },
    ]);

  const canDelete = club.viewer.isOwner || me.isAdmin;
  const screen = (
    <Stack.Screen
      options={{
        title: club.name,
        headerRight: canDelete
          ? () => <IconButton icon={Ellipsis} label="Club options" onPress={() => showSheet({ title: club.name, options: [{ label: 'Delete club', icon: Trash2, destructive: true, onPress: remove }] })} />
          : undefined,
      }}
    />
  );

  const hint = club.owner ? (
    <>Started by <Span w={600} color="greenDeep" onPress={() => router.push(profileHref(club.owner!.handle))}>@{club.owner.handle}</Span> · {memberCount(club.members)}</>
  ) : memberCount(club.members);
  const badge = <Shapes size={34} color={c.greenDeep} />;
  const requests = club.requests ?? 0;
  const about = (
    <View style={[styles.about, { borderBottomColor: c.border }]}>
      {club.description ? <Text>{club.description}</Text> : null}
      <JoinButton club={club} />
      {/* Only the founder approves members. */}
      {open && club.viewer.isOwner && (
        <Pressable
          onPress={() => router.push(clubRequestsHref(club.id))}
          accessibilityRole="button"
          style={({ pressed }) => [styles.requests, { backgroundColor: requests ? c.greenSoft : c.hover }, pressed && { opacity: 0.8 }]}
        >
          <UserPlus size={18} color={requests ? c.greenDeep : c.muted} />
          <Text w={600} size={14} color={requests ? 'greenDeep' : 'muted'} style={{ flex: 1 }}>
            {requests ? `${requests} ${requests === 1 ? 'person wants' : 'people want'} to join` : 'Join requests'}
          </Text>
          <ChevronRight size={18} color={requests ? c.greenDeep : c.muted} />
        </Pressable>
      )}
    </View>
  );

  if (!open) {
    return (
      <ScrollView style={{ flex: 1 }}>
        {screen}
        <GroupHero badge={badge} tone="soft" title={club.name} hint={hint} />
        {about}
        <Notice>
          {club.status === 'pending'
            ? 'This club is waiting for a moderator. Until it’s approved, only its founder and the moderators can see it.'
            : `A moderator didn’t approve this club.${club.viewer.isOwner ? ' You can delete it and start a new one.' : ''}`}
        </Notice>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {screen}
      <GroupScreen
        badge={badge}
        tone="soft"
        title={club.name}
        hint={hint}
        extra={about}
        composer={club.viewer.isMember ? <ComposePrompt club={club} placeholder={`Post to ${club.name}`} /> : null}
        hideClub
        endpoint={`/feed/club/${club.id}`}
        members={members}
        emptyPosts={
          <Empty icon={Shapes} title="No posts yet">
            {club.viewer.isMember ? 'Be the first to post in this club!'
              : club.viewer.requested ? 'You can post here once the founder approves your request.'
                : 'Only members can post here. Ask to join!'}
          </Empty>
        }
        emptyMembers={`Be the first to join ${club.name}.`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  about: { paddingHorizontal: 16, paddingBottom: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  requests: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
});
