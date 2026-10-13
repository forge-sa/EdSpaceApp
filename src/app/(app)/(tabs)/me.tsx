import { View } from 'react-native';
import { ComposeFab } from '@/components/Feed';
import { ProfileView } from '@/components/Profile';
import { useMe } from '@/lib/session';

export default function MyProfile() {
  const me = useMe();
  return (
    <View style={{ flex: 1 }}>
      <ProfileView handle={me.handle} />
      <ComposeFab />
    </View>
  );
}
