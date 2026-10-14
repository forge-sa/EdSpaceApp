import { useRouter, useScrollToTop } from 'expo-router';
import { Shapes } from 'lucide-react-native';
import { useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ribbon } from '@/components/brand';
import { useClasses } from '@/components/Search';
import { Text } from '@/components/Text';
import { ErrorState, Loading } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { classHref } from '@/lib/links';
import { useRefresh } from '@/lib/queries';
import { useMe } from '@/lib/session';
import { useColors } from '@/theme';

type Card =
  | { kind: 'class'; name: string; slug: string; members: number }
  | { kind: 'teachers'; members: number }
  | { kind: 'clubs'; clubs: number };

export default function Classes() {
  const c = useColors();
  const me = useMe();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const query = useClasses();
  const { refreshing, onRefresh } = useRefresh(query.refetch);
  const list = useRef<FlatList<Card>>(null);
  useScrollToTop(list);

  const columns = width >= 600 ? 4 : 3;
  const cards: Card[] = query.data
    ? [
        ...query.data.classes.map((cl) => ({ kind: 'class' as const, name: cl.name, slug: cl.slug, members: cl.members })),
        { kind: 'teachers', members: query.data.teachers },
        { kind: 'clubs', clubs: query.data.clubs ?? 0 },
      ]
    : [];

  return (
    <FlatList
      ref={list}
      data={cards}
      key={columns}
      numColumns={columns}
      keyExtractor={(card) => (card.kind === 'class' ? card.slug : card.kind)}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      columnWrapperStyle={{ gap: 10 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}
      ListHeaderComponent={<Text color="muted" size={14} style={{ paddingHorizontal: 4, paddingBottom: 4 }}>Every class at EdVille, from the school timetable</Text>}
      ListEmptyComponent={query.isPending ? <Loading /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : null}
      renderItem={({ item }) => {
        if (item.kind === 'clubs') {
          return (
            <Pressable
              onPress={() => router.push('/clubs')}
              accessibilityRole="link"
              accessibilityLabel={`Clubs, ${item.clubs} ${item.clubs === 1 ? 'club' : 'clubs'}`}
              style={({ pressed }) => [styles.card, { backgroundColor: c.surfaceRaised, borderColor: pressed ? c.green : c.border }]}
            >
              <View style={[styles.name, styles.clubsName, { backgroundColor: c.greenSoft }]}>
                <Shapes size={15} color={c.greenDeep} />
                <Text w={800} size={16} color="greenDeep" style={{ letterSpacing: -0.5 }} numberOfLines={1}>Clubs</Text>
              </View>
              <Text w={600} size={13} color="muted">{item.clubs} {item.clubs === 1 ? 'club' : 'clubs'}</Text>
            </Pressable>
          );
        }
        const teachers = item.kind === 'teachers';
        const mine = teachers ? me.role === 'teacher' : item.name === me.className;
        return (
          <Pressable
            onPress={() => router.push(teachers ? '/teachers' : classHref(item.slug))}
            accessibilityRole="link"
            accessibilityLabel={`${teachers ? 'Teachers' : `Class ${item.name}`}, ${item.members} members${mine ? ', your group' : ''}`}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: c.surfaceRaised, borderColor: mine ? c.green : c.border },
              mine && { borderWidth: 2, padding: 11 },
              pressed && { borderColor: c.green },
            ]}
          >
            {mine && <Ribbon width={20} height={30} style={{ position: 'absolute', right: 10, top: -1 }} />}
            <View style={[styles.name, { backgroundColor: teachers ? c.text : c.green }]}>
              <Text w={800} size={teachers ? 16 : 22} color={teachers ? c.surface : c.greenInk} style={{ letterSpacing: -0.5 }} numberOfLines={1}>
                {teachers ? 'Teachers' : item.name}
              </Text>
            </View>
            <Text w={600} size={13} color="muted">{item.members} {item.members === 1 ? 'member' : 'members'}</Text>
            {mine && <Text w={600} size={12} color="greenDeep">{teachers ? 'Staff room' : 'Your class'}</Text>}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 2, padding: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden', minHeight: 96 },
  name: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 1, marginBottom: 6, maxWidth: '100%' },
  clubsName: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
