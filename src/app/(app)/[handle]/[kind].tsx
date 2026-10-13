import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
import { useProfile } from '@/components/Profile';
import { Empty, ErrorState, Loading, NotFound, Tabs } from '@/components/ui';
import { UserRow } from '@/components/UserRow';
import { api, errorMessage } from '@/lib/api';
import { profileHref, useHandleParam } from '@/lib/links';
import { useRefresh } from '@/lib/queries';
import type { ListUser } from '@/lib/types';
import { useColors } from '@/theme';

type Kind = 'followers' | 'following';

export default function FollowsScreen() {
  const handle = useHandleParam();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  if (!handle || (kind !== 'followers' && kind !== 'following')) return <NotFound />;
  return <Follows handle={handle} kind={kind} />;
}

function Follows({ handle, kind }: { handle: string; kind: Kind }) {
  const c = useColors();
  const router = useRouter();
  const { data: profile } = useProfile(handle);
  const query = useQuery({
    queryKey: ['follows', handle, kind],
    queryFn: () => api<{ users: ListUser[] }>(`/users/${handle}/${kind}`).then((d) => d.users),
  });
  const { refreshing, onRefresh } = useRefresh(query.refetch);

  return (
    <>
      <Stack.Screen options={{ title: profile?.displayName ?? `@${handle}` }} />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(u) => String(u.id)}
        renderItem={({ item }) => <UserRow user={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
        ListHeaderComponent={
          <Tabs
            tabs={[{ id: 'followers', label: 'Followers' }, { id: 'following', label: 'Following' }]}
            value={kind}
            onChange={(k) => router.replace(`${profileHref(handle)}/${k}` as Parameters<typeof router.replace>[0])}
          />
        }
        ListEmptyComponent={
          query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : (
            <Empty title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'} />
          )
        }
      />
    </>
  );
}
