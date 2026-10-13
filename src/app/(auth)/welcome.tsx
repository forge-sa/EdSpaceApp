import { useRouter } from 'expo-router';
import { CalendarDays, GraduationCap, Heart, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEmailDomain } from '@/components/auth';
import { Ribbon } from '@/components/brand';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { useColors } from '@/theme';

export default function Welcome() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const domain = useEmailDomain();

  const point = (Icon: LucideIcon, text: string) => (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <Icon size={22} color={c.green} style={{ marginTop: 1 }} />
      <Text w={500} size={15.5} style={{ flex: 1 }}>{text}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 32, paddingBottom: insets.bottom + 28, paddingHorizontal: 24, gap: 32 }}
    >
      {/* The hero blocks from the website: green "EdSpace", cream tagline with a ribbon. */}
      <View style={{ gap: 14, alignItems: 'flex-start' }} accessibilityRole="header" accessibilityLabel="EdSpace. Your school, in one feed">
        <View style={[styles.blockGreen, { backgroundColor: c.green }]}>
          <Text w={800} color="greenInk" style={{ fontSize: 60, lineHeight: 64, letterSpacing: -2.6 }}>EdSpace</Text>
        </View>
        <View style={[styles.blockCream, { backgroundColor: c.surface }]}>
          <Text w={800} size={23} style={{ letterSpacing: -0.6, lineHeight: 28 }}>Your school,{'\n'}in one feed</Text>
          <Ribbon width={34} height={70} notch={0.8} style={{ position: 'absolute', right: 16, top: 0 }}>
            <Heart size={16} color={c.text} strokeWidth={3} />
          </Ribbon>
        </View>
      </View>

      <View style={{ gap: 14 }}>
        {point(GraduationCap, 'Share news, photos and questions with your classmates, teachers and the whole school.')}
        {point(CalendarDays, 'Every profile links to its timetable — your class’s, or a teacher’s own.')}
        {point(ShieldCheck, `Only for EdVille students and teachers: sign-up needs an @${domain} email.`)}
      </View>

      <View style={{ gap: 10 }}>
        <Button title="Create account" size="lg" block onPress={() => router.push('/signup')} />
        <Button title="Log in" variant="outline" size="lg" block onPress={() => router.push('/login')} />
        <Text size={13} color="muted" center style={{ marginTop: 4 }}>
          Only <Text size={13} w={700} color="muted">@{domain}</Text> addresses can register.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  blockGreen: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8, borderRadius: 12 },
  blockCream: { paddingLeft: 14, paddingRight: 72, paddingVertical: 12, borderRadius: 10, overflow: 'visible' },
});
