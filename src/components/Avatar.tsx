import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { mediaUrl } from '@/lib/api';
import { initials } from '@/lib/format';
import { classHref, profileHref } from '@/lib/links';
import type { UserSummary } from '@/lib/types';
import { useColors } from '@/theme';
import { Text } from './Text';

type AvatarUser = Pick<UserSummary, 'handle' | 'displayName' | 'avatar'>;

export function Avatar({ user, size = 44, link = true, ring, style }: {
  user: AvatarUser; size?: number; link?: boolean; ring?: number; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const router = useRouter();
  const radius = size * 0.3;
  const uri = mediaUrl(user.avatar);
  const inner = (
    <View
      style={[
        { width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' },
        ring ? { borderWidth: ring, borderColor: c.surface } : null,
        style,
      ]}
    >
      {uri ? (
        <Image source={uri} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={120} recyclingKey={uri} accessibilityIgnoresInvertColors />
      ) : (
        <Text w={800} color="greenDeep" style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}>{initials(user.displayName || user.handle)}</Text>
      )}
    </View>
  );
  if (!link) return inner;
  return (
    <Pressable onPress={() => router.push(profileHref(user.handle))} accessibilityRole="link" accessibilityLabel={`${user.displayName}'s profile`} hitSlop={4}>
      {inner}
    </Pressable>
  );
}

/** A student's class, or "Teacher" for a moderator-approved teacher. */
export function ClassTag({ user, link = true }: { user: Pick<UserSummary, 'isTeacher' | 'className' | 'classSlug'>; link?: boolean }) {
  const c = useColors();
  const router = useRouter();
  let label: string, bg: string, fg: string, href: Parameters<typeof router.push>[0] | null;
  if (user.isTeacher) {
    [label, bg, fg, href] = ['Teacher', c.text, c.surface, '/teachers'];
  } else if (user.className) {
    [label, bg, fg, href] = [user.className, c.greenSoft, c.greenDeep, user.classSlug ? classHref(user.classSlug) : null];
  } else {
    return null;
  }
  const tag = (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 6, height: 19, justifyContent: 'center', flexShrink: 0 }}>
      <Text w={700} size={12} color={fg} style={{ lineHeight: 15 }} maxFontSizeMultiplier={1.2}>{label}</Text>
    </View>
  );
  if (!link || !href) return tag;
  return (
    <Pressable onPress={() => router.push(href)} hitSlop={6} accessibilityRole="link" accessibilityLabel={user.isTeacher ? 'Teacher' : `Class ${label}`}>
      {tag}
    </Pressable>
  );
}

export function ModTag({ user, size = 16 }: { user: Pick<UserSummary, 'isAdmin'>; size?: number }) {
  const c = useColors();
  if (!user.isAdmin) return null;
  return <ShieldCheck size={size} color={c.green} accessibilityLabel="EdSpace moderator" />;
}
