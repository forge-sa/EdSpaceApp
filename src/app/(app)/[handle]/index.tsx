import { Stack } from 'expo-router';
import { View } from 'react-native';
import { ProfileView, useProfile } from '@/components/Profile';
import { NotFound } from '@/components/ui';
import { useHandleParam } from '@/lib/links';

export default function ProfileScreen() {
  const handle = useHandleParam();
  return handle ? <Profile handle={handle} /> : <NotFound />;
}

function Profile({ handle }: { handle: string }) {
  const { data } = useProfile(handle);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: data?.displayName ?? `@${handle}` }} />
      <ProfileView handle={handle} />
    </View>
  );
}
