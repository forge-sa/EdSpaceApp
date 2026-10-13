import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { GraduationCap } from 'lucide-react-native';
import { View } from 'react-native';
import { GroupScreen } from '@/components/Group';
import { Text } from '@/components/Text';
import { Empty, Loading } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useMe } from '@/lib/session';
import type { ListUser } from '@/lib/types';

interface ClassData {
  name: string;
  slug: string;
  timetableUrl: string | null;
  members: ListUser[];
}

export default function ClassPage() {
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const me = useMe();
  const fetchClass = () => api<ClassData>(`/classes/${encodeURIComponent(slug)}`);
  const query = useQuery({ queryKey: ['class', slug], queryFn: fetchClass });
  // Same cache entry, viewed as the member list.
  const members = useQuery({ queryKey: ['class', slug], queryFn: fetchClass, select: (d) => d.members });

  if (query.isPending) return <><Stack.Screen options={{ title: 'Class' }} /><Loading /></>;
  if (query.isError) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Class' }} />
        <Empty icon={GraduationCap} title="Class not found">{errorMessage(query.error)}</Empty>
      </View>
    );
  }

  const info = query.data;
  const mine = info.name === me.className;
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `Class ${info.name}` }} />
      <GroupScreen
        badge={<Text w={800} size={34} color="greenInk" style={{ letterSpacing: -1, lineHeight: 40 }}>{info.name}</Text>}
        title={mine ? 'Your class' : `Class ${info.name}`}
        hint={`Posts and people from ${info.name}.`}
        timetableUrl={info.timetableUrl}
        endpoint={`/feed/class/${encodeURIComponent(info.slug)}`}
        members={members}
        emptyPosts={<Empty icon={GraduationCap} title={`No posts from ${info.name} yet`}>{mine ? 'Be the first to post for your class!' : 'Check back later.'}</Empty>}
        emptyMembers={`No one from ${info.name} has joined EdSpace yet.`}
      />
    </View>
  );
}
