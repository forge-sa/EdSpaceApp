import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaUrl } from '@/lib/api';
import type { PostImage } from '@/lib/types';
import { Text } from './Text';

type Props = { images: PostImage[]; index: number; onClose: () => void };

/** Full-screen image viewer: swipe between images, pinch to zoom on iOS. */
export function Lightbox(props: Props) {
  // A Modal is its own native window, so it needs its own safe-area provider.
  return (
    <Modal visible animationType="fade" onRequestClose={props.onClose} statusBarTranslucent navigationBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <SafeAreaProvider>
        <Viewer {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Viewer({ images, index, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index);
  const img = images[current];

  return (
    <>
      <StatusBar style="light" />
      {/* Claims stray touches so they don't bubble (through the React tree) to the post card. */}
      <View style={{ flex: 1, backgroundColor: '#080c09' }} onStartShouldSetResponder={() => true}>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.url}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <ScrollView
              style={{ width, height }}
              contentContainerStyle={{ width, height, alignItems: 'center', justifyContent: 'center' }}
              maximumZoomScale={Platform.OS === 'ios' ? 4 : 1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={onClose} style={{ width, height }} accessibilityLabel={item.alt || 'Image'}>
                <Image source={mediaUrl(item.url)} style={{ width, height }} contentFit="contain" transition={150} />
              </Pressable>
            </ScrollView>
          )}
        />
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={[styles.close, { top: insets.top + 10 }]}
        >
          <X size={22} color="#fff" />
        </Pressable>
        {images.length > 1 && (
          <View style={[styles.counter, { top: insets.top + 16 }]}>
            <Text w={700} size={13} color="#fff">{current + 1} / {images.length}</Text>
          </View>
        )}
        {img?.alt ? (
          <View style={[styles.alt, { bottom: insets.bottom + 18 }]}>
            <Text size={14} color="#fff">{img.alt}</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  counter: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)' },
  alt: { position: 'absolute', left: 16, right: 16, padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)' },
});
