import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Avatar } from '@/components/Avatar';
import { KeyboardPadded } from '@/components/Keyboard';
import { profileKey } from '@/components/Profile';
import { Input, Span, Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, IconButton } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { charCount } from '@/lib/format';
import { appendFile, pickImages, prepareImage, type UploadFile } from '@/lib/image';
import { getPost, putPost, usePostById } from '@/lib/postStore';
import { invalidateFeeds, queryClient } from '@/lib/queries';
import { useMe, useSession } from '@/lib/session';
import type { Post } from '@/lib/types';
import { fonts, useColors } from '@/theme';

const MAX_IMAGES = 4;

interface Attachment {
  key: string;
  file: UploadFile;
  alt: string;
}

export default function Compose() {
  const c = useColors();
  const me = useMe();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { config } = useSession();
  const { replyTo: replyParam } = useLocalSearchParams<{ replyTo?: string }>();
  const replyId = replyParam ? Number(replyParam) : null;
  const replyTo = usePostById(replyId);
  const max = config?.postMaxLength ?? 300;

  const [text, setText] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [processing, setProcessing] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [altIndex, setAltIndex] = useState<number | null>(null);
  const keyboardOpen = useKeyboardState((k) => k.isVisible);
  // Two tiles per row, sized in pixels (percentage width + aspectRatio collapses in a wrapping row).
  const [rowWidth, setRowWidth] = useState(0);
  const tile = rowWidth ? Math.floor((rowWidth - 8) / 2) : 0;

  const count = charCount(text.trim());
  const remaining = max - count;
  const canPost = !busy && processing === 0 && remaining >= 0 && (text.trim().length > 0 || images.length > 0);
  const dirty = !done && (text.trim().length > 0 || images.length > 0);

  // Swiping the sheet down (or Back) with a draft asks first.
  usePreventRemove(dirty, ({ data }) => {
    Alert.alert(replyTo ? 'Discard reply?' : 'Discard post?', 'What you wrote won’t be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  // Close once prevention is off (it reads `dirty` from the last render).
  useEffect(() => {
    if (done) router.back();
  }, [done, router]);

  const addImages = async (source: 'library' | 'camera') => {
    const room = MAX_IMAGES - images.length - processing;
    if (room <= 0) return;
    let assets;
    try {
      assets = await pickImages(source, { multiple: source === 'library', limit: room });
    } catch (err) {
      Alert.alert('Can’t add photos', errorMessage(err));
      return;
    }
    if (assets.length > room) toast(`You can attach up to ${MAX_IMAGES} images`, 'error');
    const take = assets.slice(0, room);
    setProcessing((n) => n + take.length);
    for (const asset of take) {
      try {
        const file = await prepareImage(asset);
        setImages((list) => (list.length >= MAX_IMAGES ? list : [...list, { key: `${file.uri}-${list.length}`, file, alt: '' }]));
      } catch (err) {
        Alert.alert('Couldn’t add that image', errorMessage(err));
      } finally {
        setProcessing((n) => n - 1);
      }
    }
  };

  const submit = async () => {
    if (!canPost) return;
    setBusy(true);
    const form = new FormData();
    form.append('text', text);
    if (replyId) form.append('replyTo', String(replyId));
    images.forEach((img) => appendFile(form, 'images', img.file));
    form.append('alts', JSON.stringify(images.map((img) => img.alt)));
    try {
      const { post } = await api<{ post: Post }>('/posts', { method: 'POST', form });
      putPost(post);
      if (replyId) {
        const parent = getPost(replyId);
        if (parent) putPost({ ...parent, counts: { ...parent.counts, replies: parent.counts.replies + 1 } });
        queryClient.invalidateQueries({ queryKey: ['thread', replyId] });
      }
      invalidateFeeds();
      queryClient.invalidateQueries({ queryKey: profileKey(me.handle) });
      toast(replyId ? 'Reply posted' : 'Posted', 'success');
      setDone(true);
    } catch (err) {
      setBusy(false);
      Alert.alert(replyId ? 'Couldn’t post your reply' : 'Couldn’t post', errorMessage(err));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: replyId ? 'Reply' : 'New post',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
              <Text w={600} size={16}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => <Button title={replyId ? 'Reply' : 'Post'} size="sm" onPress={submit} disabled={!canPost} loading={busy} />,
        }}
      />
      <KeyboardPadded style={{ backgroundColor: c.surface }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {replyTo && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Avatar user={replyTo.author} link={false} />
                <View style={{ flex: 1, width: 2, backgroundColor: c.borderStrong, marginTop: 6, borderRadius: 1 }} />
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                <Text numberOfLines={1}>
                  <Span w={700}>{replyTo.author.displayName}</Span> <Span color="muted">@{replyTo.author.handle}</Span>
                </Text>
                <Text numberOfLines={4} style={{ marginTop: 2 }}>{replyTo.text || (replyTo.images.length ? '🖼 Image' : '')}</Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Avatar user={me} link={false} />
            <View style={{ flex: 1, minWidth: 0 }}>
              {replyTo && (
                <Text size={14} color="muted">Replying to <Span w={600} color="greenDeep">@{replyTo.author.handle}</Span></Text>
              )}
              <Input
                bare
                multiline
                autoFocus
                value={text}
                onChangeText={setText}
                placeholder={replyId ? 'Write your reply' : 'What’s happening at school?'}
                accessibilityLabel={replyId ? 'Reply text' : 'Post text'}
                style={{ fontSize: 19, lineHeight: 26, minHeight: 110, paddingTop: 8, paddingBottom: 8, textAlignVertical: 'top' }}
              />
              {(images.length > 0 || processing > 0) && (
                <View style={styles.attachments} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
                  {images.map((img, i) => (
                    <View key={img.key} style={[styles.attachment, { width: tile, height: tile, backgroundColor: c.hover, borderColor: c.border }]}>
                      <Image source={img.file.uri} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <Pressable
                        onPress={() => setImages((list) => list.filter((_, j) => j !== i))}
                        style={[styles.overlayBtn, { top: 6, right: 6 }]}
                        accessibilityLabel="Remove image"
                        hitSlop={6}
                      >
                        <X size={16} color="#fff" />
                      </Pressable>
                      <Pressable
                        onPress={() => setAltIndex(i)}
                        style={[styles.altBtn, { backgroundColor: img.alt ? c.green : 'rgba(15,20,15,0.7)' }]}
                        accessibilityLabel={img.alt ? 'Edit image description' : 'Add image description'}
                      >
                        <Text w={800} size={12} color={img.alt ? c.greenInk : '#fff'} style={{ lineHeight: 16 }}>ALT</Text>
                      </Pressable>
                    </View>
                  ))}
                  {Array.from({ length: processing }, (_, i) => (
                    <View key={`p${i}`} style={[styles.attachment, { width: tile, height: tile, backgroundColor: c.hover, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }]}>
                      <ActivityIndicator color={c.green} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        <View style={[styles.toolbar, { borderTopColor: c.border, backgroundColor: c.surface, paddingBottom: keyboardOpen ? 8 : insets.bottom + 8 }]}>
          <IconButton icon={ImagePlus} label="Add photos" color={c.green} onPress={() => addImages('library')} disabled={images.length + processing >= MAX_IMAGES} />
          <IconButton icon={Camera} label="Take a photo" color={c.green} onPress={() => addImages('camera')} disabled={images.length + processing >= MAX_IMAGES} />
          <View style={{ flex: 1 }} />
          {count > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {remaining <= 20 && (
                <Text w={remaining < 0 ? 700 : 400} size={13} color={remaining < 0 ? 'danger' : 'warn'} style={{ fontVariant: ['tabular-nums'] }}>{remaining}</Text>
              )}
              <CharRing used={count} max={max} />
            </View>
          )}
        </View>
      </KeyboardPadded>
      {altIndex != null && images[altIndex] && (
        <AltEditor
          image={images[altIndex]}
          onClose={() => setAltIndex(null)}
          onSave={(alt) => {
            setImages((list) => list.map((img, j) => (j === altIndex ? { ...img, alt } : img)));
            setAltIndex(null);
          }}
        />
      )}
    </>
  );
}

function CharRing({ used, max }: { used: number; max: number }) {
  const c = useColors();
  const r = 9;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, used / max);
  const color = used > max ? c.danger : max - used <= 20 ? c.warn : c.green;
  return (
    <Svg width={24} height={24} viewBox="0 0 22 22" accessibilityLabel={`${max - used} characters left`}>
      <Circle cx={11} cy={11} r={r} fill="none" stroke={c.border} strokeWidth={2.5} />
      <Circle cx={11} cy={11} r={r} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - frac)} strokeLinecap="round" rotation={-90} origin="11, 11" />
    </Svg>
  );
}

type AltProps = { image: Attachment; onClose: () => void; onSave: (alt: string) => void };

function AltEditor(props: AltProps) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}>
      {/* A Modal is its own native window, so it needs its own safe-area provider. */}
      <SafeAreaProvider>
        <AltForm {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function AltForm({ image, onClose, onSave }: AltProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [alt, setAlt] = useState(image.alt);
  return (
    <KeyboardPadded style={{ backgroundColor: c.surface }}>
      <View style={[styles.altHead, { borderBottomColor: c.border }]}>
        <Pressable onPress={onClose} hitSlop={10}><Text w={600} size={16}>Cancel</Text></Pressable>
        <Text w={800} size={17}>Describe this image</Text>
        <Button title="Save" size="sm" onPress={() => onSave(alt.trim())} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 16 }} keyboardShouldPersistTaps="handled">
        <Image source={image.file.uri} style={{ width: '100%', height: 240, borderRadius: 12, backgroundColor: c.hover }} contentFit="contain" />
        <Input
          value={alt}
          onChangeText={setAlt}
          autoFocus
          multiline
          maxLength={1000}
          placeholder="Alt text helps classmates who use screen readers"
          style={{ minHeight: 110, textAlignVertical: 'top', fontFamily: fonts[400] }}
        />
      </ScrollView>
    </KeyboardPadded>
  );
}

const styles = StyleSheet.create({
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  attachment: { borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  overlayBtn: { position: 'absolute', width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,20,15,0.7)' },
  altBtn: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  altHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
