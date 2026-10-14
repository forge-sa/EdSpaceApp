import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme';
import { Text } from './Text';

/**
 * Cancel · title · action bar for the composer and profile editor.
 *
 * These modals close themselves right after updating their header (busy
 * state, the discard guard turning off, the keyboard hiding). With the native
 * stack header, react-native-screens 4.26 on Android crashes when a header
 * update lands while the screen is being removed ("ScreenStackFragment added
 * into a non-stack container"), so these screens hide the native header and
 * draw this one instead.
 */
export function ModalHeader({ title, onCancel, action }: { title: string; onCancel: () => void; action?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  // An iOS page sheet starts below the status bar; Android modals are full screen.
  const top = Platform.OS === 'ios' ? 0 : insets.top;
  return (
    <View style={[styles.bar, { paddingTop: top + 8, backgroundColor: c.surface, borderBottomColor: c.border }]}>
      <View style={styles.side}>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button">
          <Text w={600} size={16}>Cancel</Text>
        </Pressable>
      </View>
      <Text w={800} size={18} numberOfLines={1} accessibilityRole="header" style={styles.title}>{title}</Text>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  side: { flex: 1 },
  title: { flexShrink: 1, textAlign: 'center' },
});
