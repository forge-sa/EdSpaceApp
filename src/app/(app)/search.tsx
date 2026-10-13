import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { FlatList, View } from 'react-native';
import { FeedList } from '@/components/Feed';
import { SearchBox } from '@/components/Search';
import { Empty, ErrorState, Loading, Tabs } from '@/components/ui';
import { UserRow } from '@/components/UserRow';
import { api, errorMessage } from '@/lib/api';
import { useMe } from '@/lib/session';
import type { ListUser } from '@/lib/types';

export default function Search() {
  const me = useMe();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; type?: string }>();
  const q = (params.q ?? '').trim();
  const type = params.type === 'users' ? 'users' : 'posts';

  const people = useQuery({
    queryKey: ['search-users', q],
    enabled: type === 'users',
    // With no query, list suggestions so the People tab is never blank.
    queryFn: () => api<{ users: ListUser[] }>(q ? `/search?type=users&q=${encodeURIComponent(q)}` : '/suggestions').then((d) => d.users),
  });

  const header = (
    <>
      <SearchBox key={q} initial={q} onSubmit={(v) => router.setParams({ q: v })} />
      <Tabs
        tabs={[{ id: 'posts', label: 'Posts' }, { id: 'users', label: 'People' }]}
        value={type}
        onChange={(t) => router.setParams({ type: t === 'users' ? 'users' : '' })}
      />
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: q || 'Search' }} />
      {type === 'posts' ? (
        q ? (
          <FeedList
            key={q}
            endpoint={`/search?q=${encodeURIComponent(q)}`}
            header={header}
            keyboardShouldPersistTaps="handled"
            empty={<Empty icon={SearchX} title={`No results for “${q}”`}>Try different words or a #hashtag.</Empty>}
          />
        ) : (
          <View>{header}<Empty icon={SearchX} title="Search EdSpace">Find posts, #hashtags, people and classes.</Empty></View>
        )
      ) : (
        <FlatList
          data={people.data ?? []}
          keyExtractor={(u) => String(u.id)}
          renderItem={({ item }) => <UserRow user={item} />}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            people.isPending ? <Loading /> : people.isError ? <ErrorState message={errorMessage(people.error)} onRetry={() => people.refetch()} /> : (
              <Empty icon={SearchX} title="No people found">Try a name, @username or class like “{me.className ?? '10A'}”.</Empty>
            )
          }
        />
      )}
    </View>
  );
}
