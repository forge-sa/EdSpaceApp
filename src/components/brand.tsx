import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useColors } from '@/theme';
import { Text } from './Text';

/** The hanging bookmark ribbon from the EdVille artwork. */
export function Ribbon({ width, height, color, notch = 0.78, children, style }: {
  width: number; height: number; color?: string; notch?: number; children?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Polygon points={`0,0 ${width},0 ${width},${height} ${width / 2},${height * notch} 0,${height}`} fill={color ?? c.green} />
      </Svg>
      {children ? <View style={{ marginBottom: height * (1 - notch) }}>{children}</View> : null}
    </View>
  );
}

/** "Ed" on green + "Space" on cream with a ribbon, as on the website. */
export function Wordmark({ size = 22, spaceBg }: { size?: number; spaceBg?: string }) {
  const c = useColors();
  const block = { borderRadius: size * 0.3, paddingTop: size * 0.12, paddingBottom: size * 0.16 };
  const type = { fontSize: size, lineHeight: size * 1.1, letterSpacing: -size * 0.035 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }} accessibilityRole="header" accessibilityLabel="EdSpace">
      <View style={[block, { backgroundColor: c.green, paddingHorizontal: size * 0.3 }]}>
        <Text w={800} color="greenInk" style={type}>Ed</Text>
      </View>
      <View style={[block, { backgroundColor: spaceBg ?? c.surface, paddingLeft: size * 0.3, paddingRight: size * 1.05 }]}>
        <Text w={800} style={type}>Space</Text>
        <Ribbon
          width={size * 0.5}
          height={size * 1.1 + size * 0.28 + size * 0.32}
          style={{ position: 'absolute', right: size * 0.28, top: 0 }}
        />
      </View>
    </View>
  );
}

/** Square app mark ("Ed" with a cream ribbon). */
export function Mark({ size = 44 }: { size?: number }) {
  const c = useColors();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Text w={800} color="greenInk" style={{ fontSize: size * 0.43, lineHeight: size * 0.5, letterSpacing: -size * 0.02 }}>Ed</Text>
      <Ribbon width={size * 0.16} height={size * 0.3} color={c.greenInk} notch={0.75} style={{ position: 'absolute', right: size * 0.16, top: 0, opacity: 0.9 }} />
    </View>
  );
}
