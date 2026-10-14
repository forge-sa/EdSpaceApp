import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Check, UserPlus, X } from 'lucide-react-native';
import { FlatList, RefreshControl, View } from 'react-native';
import { clubChanged, clubKey, type ClubData } from '@/components/Club';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, Empty, ErrorState, Loading } from '@/components/ui';
import { UserRow } from '@/components/UserRow';
import { api, errorMessage, post } from '@/lib/api';
import { queryClient, useRefresh } from '@/lib/queries';
import type { Club, ListUser } from '@/lib/types';
import { useColors } from '@/theme';

/** People asking to join a club. Only its founder can open this and decide. */
export default function ClubRequests() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const toast = useToast();
  const key = [...clubKey(id), 'requests'] as const;
  const query = useQuery({ queryKey: key, queryFn: () => api<{ users: ListUser[] }>(`/clubs/${encodeURIComponent(id)}/requests`).then((d) => d.users) });
  const club = queryClient.getQueryData<ClubData>(clubKey(id))?.club;
  const { refreshing, onRefresh } = useRefresh(query.refetch);

  const decide = async (u: ListUser, approve: boolean) => {
    try {
      const res = await post<{ club: Club }>(`/clubs/${encodeURIComponent(id)}/requests/${u.handle}/${approve ? 'approve' : 'decline'}`);
      queryClient.setQueryData<ListUser[]>(key, (list) => list?.filter((x) => x.id !== u.id));
      clubChanged(res.club);
      toast(approve ? `${u.displayName} joined ${res.club.name}` : 'Request declined', approve ? 'success' : 'info');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Join requests' }} />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(u) => String(u.id)}
        ListHeaderComponent={
          club ? <Text size={14} color="muted" style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>People who asked to join {club.name}. Only you can let them in.</Text> : null
        }
        renderItem={({ item: u }) => (
          <UserRow
            user={u}
            showBio={false}
            right={
              <View style={{ gap: 6 }}>
                <Button title="Approve" icon={Check} size="sm" onPress={() => decide(u, true)} />
                <Button title="Decline" icon={X} size="sm" variant="outline" onPress={() => decide(u, false)} />
              </View>
            }
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
        ListEmptyComponent={
          query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : (
            <Empty icon={UserPlus} title="No requests">When someone asks to join{club ? ` ${club.name}` : ''}, you’ll approve them here.</Empty>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}
