import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Presentation } from 'lucide-react-native';
import { View } from 'react-native';
import { GroupScreen } from '@/components/Group';
import { Empty } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/session';
import type { ListUser } from '@/lib/types';
import { useColors } from '@/theme';

export default function Teachers() {
  const c = useColors();
  const me = useMe();
  const members = useQuery({ queryKey: ['teachers'], queryFn: () => api<{ members: ListUser[] }>('/teachers').then((d) => d.members) });
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Teachers' }} />
      <GroupScreen
        dark
        badge={<Presentation size={34} color={c.surface} />}
        title={me.role === 'teacher' ? 'Staff room' : 'EdVille teachers'}
        hint="Posts and people from teachers confirmed by EdSpace moderators."
        endpoint="/feed/teachers"
        members={members}
        emptyPosts={<Empty icon={Presentation} title="No posts from teachers yet">Posts by confirmed teachers show up here.</Empty>}
        emptyMembers="Teachers appear here once a moderator confirms their account."
      />
    </View>
  );
}
