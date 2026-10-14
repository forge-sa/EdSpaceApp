import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { Bookmark, CalendarDays, ExternalLink, LogOut, Monitor, Moon, ShieldAlert, Sun, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlacementField, RolePicker } from '@/components/Placement';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Badge, Button, Field, FormMessage, PasswordInput, Segmented } from '@/components/ui';
import { API_URL, del, errorMessage, patch, post } from '@/lib/api';
import { openExternal } from '@/lib/links';
import { getPushState, setPushEnabled, type PushState } from '@/lib/push';
import { useMe, useSession } from '@/lib/session';
import type { Me, Role } from '@/lib/types';
import { useColors, useTheme, type ThemeSetting } from '@/theme';

function Section({ title, danger, children }: { title: string; danger?: boolean; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.section, { borderBottomColor: c.border }]}>
      <Text w={800} size={18} color={danger ? 'danger' : 'text'}>{title}</Text>
      {children}
    </View>
  );
}

function LinkRow({ icon: Icon, label, onPress, badge }: { icon: LucideIcon; label: string; onPress: () => void; badge?: number }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: c.hover }]} accessibilityRole="link">
      <Icon size={19} color={c.text} />
      <Text w={600} style={{ flex: 1 }}>{label}</Text>
      {badge ? <Badge count={badge} /> : null}
    </Pressable>
  );
}

export default function Settings() {
  const c = useColors();
  const me = useMe();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { setUser, signOut, modCount } = useSession();
  const { setting, setSetting } = useTheme();

  const [placement, setPlacement] = useState({ role: me.role, className: me.className ?? '', timetableTeacher: me.timetableTeacher?.slug ?? '' });
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [push, setPush] = useState<PushState | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setPush);
  }, []);

  const togglePush = async (on: boolean) => {
    setPushBusy(true);
    try {
      setPush(await setPushEnabled(on));
    } finally {
      setPushBusy(false);
    }
  };

  const placementChanged = placement.role !== me.role
    || (placement.role === 'student' ? placement.className !== (me.className ?? '') : placement.timetableTeacher !== (me.timetableTeacher?.slug ?? ''));

  const savePlacement = async () => {
    const run = async () => {
      setSavingPlacement(true);
      try {
        const body = placement.role === 'teacher'
          ? { role: 'teacher', timetableTeacher: placement.timetableTeacher }
          : { role: 'student', className: placement.className };
        const { user } = await patch<{ user: Me }>('/me', body);
        setUser(user);
        toast(
          user.role === 'teacher'
            ? (user.teacherStatus === 'pending' ? 'Saved — a moderator will confirm your teacher account' : 'Saved')
            : `Class set to ${user.className}`,
          'success',
        );
      } catch (err) {
        toast(errorMessage(err), 'error');
      } finally {
        setSavingPlacement(false);
      }
    };
    if (me.role === 'teacher' && placement.role === 'student' && me.isTeacher) {
      Alert.alert('Switch to a student account?', 'You’ll lose the Teacher badge.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const changePassword = async () => {
    setPwBusy(true);
    try {
      await post('/me/password', { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '' });
      toast('Password changed', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setPwBusy(false);
    }
  };

  const logout = () =>
    Alert.alert(`Log out @${me.handle}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);

  const deleteAccount = () =>
    Alert.alert('Delete your account for good?', 'Your posts, likes and follows will be removed. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: async () => {
          try {
            await del('/me', { password: delPw });
            setUser(null);
            toast('Your account was deleted');
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      },
    ]);

  const version = Constants.expoConfig?.version;
  return (
    <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Section title="Account">
        <Field label="School email"><Text>{me.email}</Text></Field>
        <View style={{ marginHorizontal: -16, marginBottom: -8 }}>
          <LinkRow icon={Bookmark} label="Bookmarks" onPress={() => router.push('/bookmarks')} />
          {me.isAdmin && <LinkRow icon={ShieldAlert} label="Moderation" badge={modCount} onPress={() => router.push('/admin')} />}
        </View>
      </Section>

      <Section title="Student or teacher">
        {me.role === 'teacher' && (
          <Text size={14} color="muted" style={{ marginTop: -6 }}>
            {me.teacherStatus === 'approved' && 'Your account is confirmed as a teacher.'}
            {me.teacherStatus === 'pending' && 'Waiting for a moderator to confirm you’re a teacher.'}
            {me.teacherStatus === 'declined' && 'A moderator didn’t confirm this teacher account. Ask an EdSpace moderator if this is a mistake.'}
          </Text>
        )}
        <RolePicker role={placement.role} onChange={(role: Role) => setPlacement((p) => ({ ...p, role }))} />
        <PlacementField
          role={placement.role}
          className={placement.className}
          timetableTeacher={placement.timetableTeacher}
          onClass={(className) => setPlacement((p) => ({ ...p, className }))}
          onTimetable={(timetableTeacher) => setPlacement((p) => ({ ...p, timetableTeacher }))}
        />
        {placement.role === 'teacher' && me.role !== 'teacher' && (
          <FormMessage tone="note">Teacher accounts are confirmed by a moderator before the Teacher badge shows.</FormMessage>
        )}
        <Button
          title="Save"
          style={{ alignSelf: 'flex-start' }}
          onPress={savePlacement}
          loading={savingPlacement}
          disabled={!placementChanged || (placement.role === 'student' && !placement.className)}
        />
      </Section>

      <Section title="Notifications">
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text w={600}>Push notifications</Text>
            <Text size={14} color="muted">
              {push === 'unavailable' ? 'Not available in this version of the app (push needs the installed EdSpace app, not Expo Go).'
                : push === 'denied' ? 'Notifications are turned off for EdSpace in your phone’s settings.'
                  : 'Likes, replies, follows, club and parliament news, even when the app is closed.'}
            </Text>
          </View>
          <Switch
            value={push === 'on'}
            onValueChange={togglePush}
            disabled={push == null || push === 'unavailable' || push === 'denied' || pushBusy}
            trackColor={{ true: c.green, false: c.borderStrong }}
            thumbColor={c.surfaceRaised}
            accessibilityLabel="Push notifications"
          />
        </View>
        {push === 'denied' && (
          <Button title="Open phone settings" variant="outline" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => Linking.openSettings()} />
        )}
      </Section>

      <Section title="Appearance">
        <Segmented<ThemeSetting>
          value={setting}
          onChange={setSetting}
          options={[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ]}
        />
      </Section>

      <Section title="Change password">
        <Field label="Current password">
          <PasswordInput value={pw.current} onChangeText={(v) => setPw((p) => ({ ...p, current: v }))} autoComplete="current-password" textContentType="password" />
        </Field>
        <Field label="New password">
          <PasswordInput value={pw.next} onChangeText={(v) => setPw((p) => ({ ...p, next: v }))} autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" />
        </Field>
        <Button title="Update password" style={{ alignSelf: 'flex-start' }} onPress={changePassword} loading={pwBusy} disabled={!pw.current || pw.next.length < 8} />
      </Section>

      <Section title="Session">
        <Button title="Log out" icon={LogOut} variant="outline" style={{ alignSelf: 'flex-start' }} onPress={logout} />
      </Section>

      <Section title="Delete account" danger>
        <Text size={14} color="muted" style={{ marginTop: -6 }}>This permanently removes your profile, posts, likes and follows.</Text>
        {!delOpen ? (
          <Button title="Delete my account…" variant="dangerOutline" style={{ alignSelf: 'flex-start' }} onPress={() => setDelOpen(true)} />
        ) : (
          <>
            <Field label="Confirm with your password">
              <PasswordInput value={delPw} onChangeText={setDelPw} autoComplete="current-password" textContentType="password" />
            </Field>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Delete forever" variant="danger" disabled={!delPw} onPress={deleteAccount} />
              <Button title="Cancel" variant="outline" onPress={() => { setDelOpen(false); setDelPw(''); }} />
            </View>
          </>
        )}
      </Section>

      <Section title="About">
        <View style={{ marginHorizontal: -16, marginVertical: -8 }}>
          <LinkRow icon={ExternalLink} label="EdSpace on the web" onPress={() => openExternal(API_URL)} />
          <LinkRow icon={CalendarDays} label="EdVille timetable" onPress={() => openExternal('https://edvilletimetable.pythonanywhere.com')} />
        </View>
        <Text size={13} color="faint">EdSpace for EdVille students{version ? ` · v${version}` : ''}</Text>
      </Section>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { paddingVertical: 20, paddingHorizontal: 16, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16 },
});
