import type { UseQueryResult } from '@tanstack/react-query';
import { CalendarDays, Users } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { errorMessage } from '@/lib/api';
import { openExternal } from '@/lib/links';
import { useRefresh } from '@/lib/queries';
import type { ListUser } from '@/lib/types';
import { useColors } from '@/theme';
import { FeedList } from './Feed';
import { Text } from './Text';
import { Button, Empty, ErrorState, Loading, Tabs } from './ui';
import { UserRow } from './UserRow';

/** A class or the staff room: hero, then Posts / Members tabs. */
export function GroupScreen({ badge, dark, title, hint, timetableUrl, endpoint, members, emptyPosts, emptyMembers }: {
  badge: ReactNode;
  dark?: boolean;
  title: string;
  hint: string;
  timetableUrl?: string | null;
  endpoint: string;
  members: UseQueryResult<ListUser[]>;
  emptyPosts: ReactNode;
  emptyMembers: string;
}) {
  const c = useColors();
  const [tab, setTab] = useState<'posts' | 'members'>('posts');
  const { refreshing, onRefresh } = useRefresh(members.refetch);
  const count = members.data?.length;

  const header = (
    <>
      <View style={[styles.hero, { borderBottomColor: c.border }]}>
        <View style={[styles.badge, { backgroundColor: dark ? c.text : c.green }]}>{badge}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text w={800} size={20}>{title}</Text>
          <Text size={13} color="muted">{hint}</Text>
        </View>
      </View>
      {timetableUrl ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
          <Button title="Timetable" icon={CalendarDays} variant="outline" onPress={() => openExternal(timetableUrl)} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
      <Tabs
        tabs={[{ id: 'posts', label: 'Posts' }, { id: 'members', label: count != null ? `Members (${count})` : 'Members' }]}
        value={tab}
        onChange={setTab}
      />
    </>
  );

  if (tab === 'posts') {
    return <FeedList endpoint={endpoint} header={header} empty={emptyPosts} onRefreshExtra={members.refetch} />;
  }
  return (
    <FlatList
      data={members.data ?? []}
      keyExtractor={(u) => String(u.id)}
      renderItem={({ item }) => <UserRow user={item} />}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
      ListEmptyComponent={
        members.isPending ? <Loading /> : members.isError ? <ErrorState message={errorMessage(members.error)} onRetry={() => members.refetch()} /> : (
          <Empty icon={Users} title="Nobody here yet">{emptyMembers}</Empty>
        )
      }
      ListFooterComponent={<View style={{ height: 40 }} />}
    />
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  badge: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
});
