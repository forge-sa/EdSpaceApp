import { Tabs, useRouter } from 'expo-router';
import { Bell, Bookmark, GraduationCap, House, Search, Settings, ShieldAlert, User, type LucideIcon } from 'lucide-react-native';
import { View, type ColorValue } from 'react-native';
import { Wordmark } from '@/components/brand';
import { IconButton } from '@/components/ui';
import { useSession } from '@/lib/session';
import { fonts, useColors } from '@/theme';

const icon = (Icon: LucideIcon) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon size={25} color={color as string} strokeWidth={focused ? 2.4 : 2} />;
  };

function HomeActions() {
  const router = useRouter();
  const { user, modCount } = useSession();
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginRight: 8 }}>
      {user?.isAdmin && <IconButton icon={ShieldAlert} label="Moderation" badge={modCount} onPress={() => router.push('/admin')} />}
      <IconButton icon={Bookmark} label="Bookmarks" onPress={() => router.push('/bookmarks')} />
      <IconButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
    </View>
  );
}

export default function TabsLayout() {
  const c = useColors();
  const router = useRouter();
  const { unread, user } = useSession();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.green,
        tabBarInactiveTintColor: c.muted,
        tabBarShowLabel: false,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        headerStyle: { backgroundColor: c.surface, borderBottomColor: c.border },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: fonts[800], fontSize: 20 },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: icon(House),
          headerTitle: () => <Wordmark size={20} spaceBg={c.bg} />,
          headerRight: () => <HomeActions />,
        }}
      />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarAccessibilityLabel: 'Explore', tabBarIcon: icon(Search) }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes', tabBarAccessibilityLabel: 'Classes', tabBarIcon: icon(GraduationCap) }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          // Labels are hidden, so screen readers need these spelled out.
          tabBarAccessibilityLabel: unread > 0 ? `Notifications, ${unread} unread` : 'Notifications',
          tabBarIcon: icon(Bell),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: c.green, color: c.greenInk, fontFamily: fonts[800], fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: user?.displayName ?? 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: icon(User),
          headerRight: () => (
            <View style={{ marginRight: 8 }}>
              <IconButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
