import { forwardRef, useState } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { fonts, useColors, type ColorName, type Weight } from '@/theme';

export interface Props extends TextProps {
  /** Font weight; picks the matching Inter face. */
  w?: Weight;
  size?: number;
  /** A palette name or any color string. */
  color?: ColorName | (string & {});
  center?: boolean;
}

export function Text({ w = 400, size = 15, color = 'text', center, style, ...rest }: Props) {
  const colors = useColors();
  const c = color in colors ? colors[color as ColorName] : color;
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        { fontFamily: fonts[w], fontSize: size, lineHeight: Math.round(size * 1.4), color: c },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

/** Inline text inside a <Text>: inherits size, overrides weight and color. */
export function Span({ w, color, style, ...rest }: Omit<Props, 'size' | 'center'>) {
  const colors = useColors();
  const c = color ? (color in colors ? colors[color as ColorName] : color) : undefined;
  return <RNText {...rest} style={[w && { fontFamily: fonts[w] }, c ? { color: c } : null, style]} />;
}

/** Text input in the EdSpace style: cream field, green ring on focus. */
export const Input = forwardRef<RNTextInput, TextInputProps & { bare?: boolean }>(function Input(
  { style, bare, onFocus, onBlur, ...rest },
  ref,
) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={colors.faint}
      selectionColor={colors.green}
      cursorColor={colors.green}
      underlineColorAndroid="transparent"
      maxFontSizeMultiplier={1.4}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
      style={[
        { fontFamily: fonts[400], fontSize: 16, color: colors.text },
        !bare && {
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: focused ? colors.green : colors.borderStrong,
          backgroundColor: colors.surfaceRaised,
        },
        style,
      ]}
    />
  );
});
