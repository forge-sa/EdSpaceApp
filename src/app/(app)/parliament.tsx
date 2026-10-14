import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Landmark, ListChecks } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Avatar, ClassTag, ModTag } from '@/components/Avatar';
import { ComposePrompt, FeedList } from '@/components/Feed';
import { GroupHero } from '@/components/Group';
import { Text } from '@/components/Text';
import { Empty, ErrorState, Loading, Notice, SectionTitle, Tabs } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { profileHref } from '@/lib/links';
import { useRefresh } from '@/lib/queries';
import { useMe } from '@/lib/session';
import type { ParliamentRole } from '@/lib/types';
import { useColors } from '@/theme';

type Row = { type: 'heading'; title: string } | { type: 'role'; role: ParliamentRole } | { type: 'vacant'; text: string };

/** The school parliament: who holds which role, and their posts and polls. */
export default function Parliament() {
  const c = useColors();
  const me = useMe();
  const [tab, setTab] = useState<'members' | 'posts'>('members');
  const query = useQuery({ queryKey: ['parliament'], queryFn: () => api<{ roles: ParliamentRole[] }>('/parliament').then((d) => d.roles) });
  const { refreshing, onRefresh } = useRefresh(query.refetch);

  const header = (
    <>
      <GroupHero
        badge={<Landmark size={34} color={c.gold} />}
        tone="gold"
        title="School Parliament"
        hint="The president, vice-president and ministers. They can run school-wide polls."
      />
      <Tabs tabs={[{ id: 'members', label: 'Members' }, { id: 'posts', label: 'Posts & polls' }]} value={tab} onChange={setTab} />
    </>
  );

  if (tab === 'posts') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Parliament' }} />
        <FeedList
          endpoint="/feed/parliament"
          header={<>{header}{me.canPoll ? <ComposePrompt placeholder="Post to the school, or add a poll" /> : null}</>}
          empty={<Empty icon={Landmark} title="Nothing yet">Posts and polls from the school parliament show up here.</Empty>}
          onRefreshExtra={query.refetch}
        />
      </View>
    );
  }

  const roles = query.data ?? [];
  const seat = (kind: ParliamentRole['kind'], title: string): Row[] => {
    const role = roles.find((r) => r.kind === kind);
    return [{ type: 'heading', title }, role ? { type: 'role', role } : { type: 'vacant', text: `No ${title.toLowerCase()} yet.` }];
  };
  const ministers = roles.filter((r) => r.kind === 'minister');
  const rows: Row[] = query.data
    ? [
        ...seat('president', 'President'),
        ...seat('vice_president', 'Vice-President'),
        { type: 'heading', title: 'Ministers' },
        ...(ministers.length ? ministers.map((role): Row => ({ type: 'role', role })) : [{ type: 'vacant', text: 'No ministers yet.' } as Row]),
      ]
    : [];

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Parliament' }} />
      <FlatList
        data={rows}
        keyExtractor={(row, i) => (row.type === 'role' ? `r${row.role.id}` : `${row.type}${i}`)}
        ListHeaderComponent={header}
        renderItem={({ item }) =>
          item.type === 'heading' ? <SectionTitle>{item.title}</SectionTitle>
            : item.type === 'vacant' ? <Text color="muted" size={14} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{item.text}</Text>
              : <RoleRow role={item.role} />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
        ListEmptyComponent={query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : null}
        ListFooterComponent={
          <View style={{ paddingBottom: 40 }}>
            {me.isAdmin && query.data ? <Notice>Moderators give and change roles on the EdSpace website’s Parliament page.</Notice> : null}
          </View>
        }
      />
    </View>
  );
}

function RoleRow({ role }: { role: ParliamentRole }) {
  const c = useColors();
  const router = useRouter();
  const u = role.user;
  return (
    <Pressable
      onPress={() => router.push(profileHref(u.handle))}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.hover }]}
      accessibilityRole="link"
      accessibilityLabel={`${u.displayName}, ${role.title}`}
    >
      <Avatar user={u} link={false} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.line1}>
          <Text w={700} numberOfLines={1} style={{ flexShrink: 1 }}>{u.displayName}</Text>
          <ModTag user={u} />
          <ClassTag user={{ ...u, parliament: null }} link={false} />
        </View>
        <Text w={700} size={14} color="gold">{role.title}</Text>
        <View style={styles.line1}>
          <Text size={14} color="muted">@{u.handle}</Text>
          {role.canPoll && (
            <>
              <Text size={14} color="muted">·</Text>
              <ListChecks size={13} color={c.muted} />
              <Text size={14} color="muted">Can make polls</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  line1: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
});
