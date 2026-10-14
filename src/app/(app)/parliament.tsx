import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Ellipsis, Landmark, ListChecks, Pencil, Plus, Trash2, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Avatar, ClassTag, ModTag } from '@/components/Avatar';
import { ComposePrompt, FeedList } from '@/components/Feed';
import { GroupHero } from '@/components/Group';
import { useActionSheet, type SheetOption } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, Empty, ErrorState, IconButton, Loading, SectionTitle, Tabs } from '@/components/ui';
import { api, del, errorMessage, patch } from '@/lib/api';
import { profileHref } from '@/lib/links';
import { invalidateFeeds, queryClient, useRefresh } from '@/lib/queries';
import { useMe } from '@/lib/session';
import type { ParliamentRole } from '@/lib/types';
import { useColors } from '@/theme';

type Row =
  | { type: 'heading'; title: string }
  | { type: 'role'; role: ParliamentRole }
  | { type: 'vacant'; text: string }
  /** Moderators only: give out an empty seat or add a minister. */
  | { type: 'assign'; kind: ParliamentRole['kind']; label: string };

/** The school parliament: who holds which role, and their posts and polls. */
export default function Parliament() {
  const c = useColors();
  const me = useMe();
  const router = useRouter();
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
  const admin = me.isAdmin;
  const seat = (kind: ParliamentRole['kind'], title: string): Row[] => {
    const role = roles.find((r) => r.kind === kind);
    if (role) return [{ type: 'heading', title }, { type: 'role', role }];
    return [
      { type: 'heading', title },
      { type: 'vacant', text: `No ${title.toLowerCase()} yet.` },
      ...(admin ? [{ type: 'assign', kind, label: `Assign ${title}` } as Row] : []),
    ];
  };
  const ministers = roles.filter((r) => r.kind === 'minister');
  const rows: Row[] = query.data
    ? [
        ...seat('president', 'President'),
        ...seat('vice_president', 'Vice-President'),
        { type: 'heading', title: 'Ministers' },
        ...(ministers.length ? ministers.map((role): Row => ({ type: 'role', role })) : [{ type: 'vacant', text: 'No ministers yet.' } as Row]),
        ...(admin ? [{ type: 'assign', kind: 'minister', label: 'Add minister' } as Row] : []),
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
              : item.type === 'assign' ? (
                <Button
                  title={item.label}
                  icon={item.kind === 'minister' ? Plus : UserPlus}
                  variant="outline"
                  size="sm"
                  style={{ alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 8 }}
                  onPress={() => router.push({ pathname: '/parliament-role', params: { kind: item.kind } })}
                />
              )
                : <RoleRow role={item.role} admin={admin} />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
        ListEmptyComponent={query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : null}
        ListFooterComponent={
          <View style={{ paddingBottom: 40 }}>
            {admin && query.data ? <Text size={13} color="muted" style={{ padding: 16 }}>Only moderators see these controls. Each person can hold one role.</Text> : null}
          </View>
        }
      />
    </View>
  );
}

function RoleRow({ role, admin }: { role: ParliamentRole; admin: boolean }) {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const showSheet = useActionSheet();
  const u = role.user;

  const changed = (message: string) => {
    toast(message, 'success');
    queryClient.invalidateQueries({ queryKey: ['parliament'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    invalidateFeeds();
  };
  const run = (fn: () => Promise<unknown>, message: string) => fn().then(() => changed(message)).catch((err) => toast(errorMessage(err), 'error'));

  const menu = () => {
    const options: SheetOption[] = [];
    if (role.kind === 'minister') {
      options.push(
        { label: 'Change title', icon: Pencil, onPress: () => router.push({ pathname: '/parliament-role', params: { id: String(role.id) } }) },
        role.canPoll
          ? { label: 'Stop school polls', icon: ListChecks, onPress: () => run(() => patch(`/parliament/${role.id}`, { canPoll: false }), 'Can’t make polls any more') }
          : { label: 'Allow school polls', icon: ListChecks, onPress: () => run(() => patch(`/parliament/${role.id}`, { canPoll: true }), 'Can make polls now') },
      );
    }
    options.push({
      label: 'Remove role',
      icon: Trash2,
      destructive: true,
      onPress: () =>
        Alert.alert(`Remove @${u.handle}?`, `They won’t be ${role.title} any more.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => run(() => del(`/parliament/${role.id}`), 'Role removed') },
        ]),
    });
    showSheet({ title: `${u.displayName} · ${role.title}`, options });
  };
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
      {admin && <IconButton icon={Ellipsis} label={`Manage ${role.title}`} color={c.muted} onPress={menu} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  line1: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
});
