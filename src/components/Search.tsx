import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Hash, Search as SearchIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '@/lib/api';
import { compact } from '@/lib/format';
import { classHref, searchHref } from '@/lib/links';
import { useMe } from '@/lib/session';
import type { ClassInfo } from '@/lib/types';
import { useColors } from '@/theme';
import { Input, Text } from './Text';
import { SectionTitle } from './ui';

export function SearchBox({ initial = '', onSubmit, autoFocus }: { initial?: string; onSubmit?: (q: string) => void; autoFocus?: boolean }) {
  const c = useColors();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const submit = () => {
    const v = q.trim();
    if (!v) return;
    if (onSubmit) onSubmit(v);
    else router.push(searchHref(v));
  };
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
      <View style={[styles.box, { backgroundColor: c.hover }]}>
        <SearchIcon size={18} color={c.muted} />
        <Input
          bare
          value={q}
          onChangeText={setQ}
          onSubmitEditing={submit}
          autoFocus={autoFocus}
          returnKeyType="search"
          placeholder="Search posts, #tags, people or classes"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search EdSpace"
          style={{ flex: 1, paddingVertical: 11 }}
        />
      </View>
    </View>
  );
}

export function useTrending() {
  return useQuery({ queryKey: ['trending'], queryFn: () => api<{ tags: { tag: string; posts: number }[] }>('/trending').then((d) => d.tags) });
}

export function useClasses() {
  return useQuery({ queryKey: ['classes'], queryFn: () => api<{ classes: Required<ClassInfo>[]; teachers: number; clubs?: number; parliament?: number }>('/classes') });
}

export function Trending() {
  const c = useColors();
  const router = useRouter();
  const { data: tags } = useTrending();
  if (!tags?.length) return null;
  return (
    <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, paddingBottom: 6 }}>
      <SectionTitle>Trending this week</SectionTitle>
      {tags.map((t) => (
        <Pressable
          key={t.tag}
          onPress={() => router.push(searchHref('#' + t.tag))}
          style={({ pressed }) => [{ paddingVertical: 9, paddingHorizontal: 16 }, pressed && { backgroundColor: c.hover }]}
          accessibilityRole="link"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Hash size={16} color={c.green} />
            <Text w={700}>{t.tag}</Text>
          </View>
          <Text size={13} color="muted">{compact(t.posts)} {t.posts === 1 ? 'post' : 'posts'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Horizontal strip of class chips. */
export function ClassStrip() {
  const c = useColors();
  const router = useRouter();
  const me = useMe();
  const { data } = useClasses();
  if (!data?.classes.length) return null;
  return (
    <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, paddingBottom: 14 }}>
      <SectionTitle>Classes</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 4 }}>
        {data.classes.map((cl) => {
          const mine = cl.name === me.className;
          return (
            <Pressable
              key={cl.slug}
              onPress={() => router.push(classHref(cl.slug))}
              style={[styles.chip, { backgroundColor: c.surfaceRaised, borderColor: mine ? c.green : c.border }, mine && { borderWidth: 2 }]}
              accessibilityRole="link"
              accessibilityLabel={`Class ${cl.name}, ${cl.members} members`}
            >
              <View style={[styles.chipName, { backgroundColor: c.green }]}>
                <Text w={800} size={15} color="greenInk">{cl.name}</Text>
              </View>
              <Text w={600} size={12} color="muted">{cl.members}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 10, borderRadius: 12, borderWidth: 1 },
  chipName: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1 },
});
