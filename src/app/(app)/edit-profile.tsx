import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { Camera, ImageOff, Images, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { ModalHeader } from '@/components/ModalHeader';
import { PlacementField } from '@/components/Placement';
import { profileKey } from '@/components/Profile';
import { useActionSheet, type SheetOption } from '@/components/Sheet';
import { Input } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, Field } from '@/components/ui';
import { api, errorMessage, mediaUrl, patch } from '@/lib/api';
import { charCount } from '@/lib/format';
import { appendFile, pickImages, prepareImage } from '@/lib/image';
import { invalidateFeeds, queryClient } from '@/lib/queries';
import { useMe, useSession } from '@/lib/session';
import type { Me } from '@/lib/types';
import { useColors } from '@/theme';

type ImageField = 'avatar' | 'banner';

export default function EditProfile() {
  const c = useColors();
  const me = useMe();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const showSheet = useActionSheet();
  const { setUser } = useSession();

  const [displayName, setDisplayName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio);
  const [className, setClassName] = useState(me.className ?? '');
  const [timetableTeacher, setTimetableTeacher] = useState(me.timetableTeacher?.slug ?? '');
  const [busy, setBusy] = useState<ImageField | 'save' | null>(null);
  const [saved, setSaved] = useState(false);

  const bioLeft = 160 - charCount(bio);
  const dirty = !saved && (
    displayName !== me.displayName || bio !== me.bio
    || (me.role === 'teacher' ? timetableTeacher !== (me.timetableTeacher?.slug ?? '') : className !== (me.className ?? ''))
  );

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Discard changes?', 'Your profile changes won’t be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (saved) router.back();
  }, [saved, router]);

  const applied = (u: Me) => {
    setUser(u);
    queryClient.invalidateQueries({ queryKey: profileKey(u.handle) });
  };

  const upload = async (field: ImageField, source: 'library' | 'camera') => {
    let assets;
    try {
      assets = await pickImages(source);
    } catch (err) {
      Alert.alert('Can’t add a photo', errorMessage(err));
      return;
    }
    if (!assets.length) return;
    setBusy(field);
    try {
      const file = await prepareImage(assets[0], field === 'avatar' ? { max: 400, aspect: 1 } : { max: 1500, aspect: 3 });
      const form = new FormData();
      appendFile(form, 'image', file);
      const { user } = await api<{ user: Me }>(`/me/${field}`, { method: 'POST', form });
      applied(user);
    } catch (err) {
      Alert.alert('Couldn’t update the photo', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (field: ImageField) => {
    setBusy(field);
    try {
      const { user } = await api<{ user: Me }>(`/me/${field}`, { method: 'DELETE' });
      applied(user);
    } catch (err) {
      Alert.alert('Couldn’t remove the photo', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const imageMenu = (field: ImageField) => {
    const has = Boolean(field === 'avatar' ? me.avatar : me.banner);
    const options: SheetOption[] = [
      { label: 'Choose from library', icon: Images, onPress: () => upload(field, 'library') },
      { label: 'Take a photo', icon: Camera, onPress: () => upload(field, 'camera') },
      ...(has ? [{ label: field === 'avatar' ? 'Remove photo' : 'Remove banner', icon: field === 'avatar' ? Trash2 : ImageOff, destructive: true, onPress: () => remove(field) }] : []),
    ];
    showSheet({ title: field === 'avatar' ? 'Profile photo' : 'Banner', options });
  };

  const save = async () => {
    setBusy('save');
    try {
      const placement = me.role === 'teacher' ? { timetableTeacher } : { className };
      const { user } = await patch<{ user: Me }>('/me', { displayName, bio, ...placement });
      applied(user);
      invalidateFeeds();
      toast('Profile saved', 'success');
      setSaved(true);
    } catch (err) {
      setBusy(null);
      Alert.alert('Couldn’t save', errorMessage(err));
    }
  };

  const banner = mediaUrl(me.banner);
  return (
    <>
      <ModalHeader
        title="Edit profile"
        onCancel={() => router.back()}
        action={<Button title="Save" variant="dark" size="sm" onPress={save} loading={busy === 'save'} disabled={!displayName.trim() || bioLeft < 0 || busy != null} />}
      />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: insets.bottom + 24 }}>
        <View>
          <Pressable onPress={() => imageMenu('banner')} style={[styles.banner, { backgroundColor: c.green }]} accessibilityRole="button" accessibilityLabel="Change banner">
            {banner && <Image source={banner} style={StyleSheet.absoluteFill} contentFit="cover" />}
            <View style={styles.overlay}>
              {busy === 'banner' ? <ActivityIndicator color="#fff" /> : <View style={styles.overlayBtn}><Camera size={20} color="#fff" /></View>}
            </View>
          </Pressable>
          <Pressable onPress={() => imageMenu('avatar')} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <Avatar user={me} size={96} link={false} ring={4} />
            <View style={[styles.overlay, { borderRadius: 29 }]}>
              {busy === 'avatar' ? <ActivityIndicator color="#fff" /> : <View style={styles.overlayBtn}><Camera size={20} color="#fff" /></View>}
            </View>
          </Pressable>
        </View>
        <Field label="Name">
          <Input value={displayName} onChangeText={setDisplayName} maxLength={50} accessibilityLabel="Name" />
        </Field>
        <Field label="Bio" hint={String(bioLeft)} hintTone={bioLeft < 0 ? 'error' : undefined}>
          <Input
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Clubs, interests, what you’re into…"
            accessibilityLabel="Bio"
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
        </Field>
        <PlacementField
          role={me.role}
          className={className}
          timetableTeacher={timetableTeacher}
          onClass={setClassName}
          onTimetable={setTimetableTeacher}
        />
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  banner: { aspectRatio: 3, borderRadius: 14, overflow: 'hidden' },
  avatar: { marginTop: -48, marginLeft: 14, alignSelf: 'flex-start' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  overlayBtn: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,20,15,0.6)' },
});
