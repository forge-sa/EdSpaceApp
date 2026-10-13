import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

/**
 * Keeps a screen's bottom edge (e.g. the composer toolbar) above the
 * keyboard by padding it by the keyboard's animated height. Only for views
 * that reach the bottom of the screen; unlike a KeyboardAvoidingView it needs
 * no header or modal offsets, which differ per platform and presentation.
 */
export function KeyboardPadded({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { height } = useReanimatedKeyboardAnimation(); // 0 → -keyboard height
  const padding = useAnimatedStyle(() => ({ paddingBottom: -height.value }));
  return <Animated.View style={[{ flex: 1 }, style, padding]}>{children}</Animated.View>;
}
