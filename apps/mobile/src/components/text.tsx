import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'body' | 'bodyBold' | 'caption' | 'label' | 'story';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  bodyBold: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.textSub },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.accent },
  story: { fontFamily: fonts.story, fontSize: 17, lineHeight: 28 },
};

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return (
    <Text
      style={[{ color: colors.text }, variants[variant], color ? { color } : null, style]}
      {...rest}
    />
  );
}
