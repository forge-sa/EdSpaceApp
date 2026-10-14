import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Plus, Shapes } from 'lucide-react-native';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { CLUBS_KEY, ClubRow, ClubStatusPill, JoinButton, memberCount, type ClubList } from '@/components/Club';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, Empty, ErrorState, IconButton, Loading, SectionTitle } from '@/components/ui';
import { api, del, errorMessage } from '@/lib/api';
import { queryClient, useRefresh } from '@/lib/queries';
import type { Club } from '@/lib/types';
import { useColors } from '@/theme';

export default function Clubs() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const query = useQuery({ queryKey: CLUBS_KEY, queryFn: () => api<ClubList>('/clubs') });
  const { refreshing, onRefresh } = useRefresh(query.refetch);
  const requests = query.data?.requests ?? [];
  const start = () => router.push('/new-club');

  const withdraw = (club: Club) =>
    Alert.alert(club.status === 'pending' ? `Withdraw ${club.name}?` : `Remove ${club.name}?`, club.status === 'pending' ? 'Moderators won’t review it.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: club.status === 'pending' ? 'Withdraw' : 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await del(`/clubs/${club.id}`);
            queryClient.setQueryData<ClubList>(CLUBS_KEY, (d) => d && { ...d, requests: d.requests.filter((x) => x.id !== club.id) });
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      },
    ]);

  const header = (
    <>
      <Text size={14} color="muted" style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        Student clubs at EdVille. Anyone can start one — a moderator approves it before it shows up here.
      </Text>
      {requests.length > 0 && (
        <>
          <SectionTitle>Your requests</SectionTitle>
          {requests.map((club) => (
            <ClubRow
              key={club.id}
              club={club}
              meta={<ClubStatusPill club={club} />}
              right={<Button title={club.status === 'pending' ? 'Withdraw' : 'Remove'} size="sm" variant="outline" onPress={() => withdraw(club)} />}
            />
          ))}
          <SectionTitle>All clubs</SectionTitle>
        </>
      )}
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Clubs', headerRight: () => <IconButton icon={Plus} label="Start a club" onPress={start} /> }} />
      <FlatList
        data={query.data?.clubs ?? []}
        keyExtractor={(club) => String(club.id)}
        ListHeaderComponent={header}
        renderItem={({ item: club }) => (
          <ClubRow
            club={club}
            meta={
              <Text size={13} w={600} color="muted">
                {memberCount(club.members)}{club.viewer.isOwner ? ' · You started it' : club.viewer.isMember ? ' · You’re a member' : ''}
              </Text>
            }
            right={<JoinButton club={club} small />}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
        ListEmptyComponent={
          query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : (
            <Empty icon={Shapes} title="No clubs yet" action={<Button title="Start a club" icon={Plus} onPress={start} />}>
              Start the first one. A moderator reviews new clubs before they appear here.
            </Empty>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}
