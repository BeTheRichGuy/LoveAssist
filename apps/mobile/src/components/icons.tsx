import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

// 디자인 시안의 SVG 아이콘을 그대로 옮겼다.

type IconProps = { size?: number; color?: string; strokeWidth?: number };

function Stroke({
  size = 24,
  color = colors.text,
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

const HEART =
  'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z';

export const SparkleIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  </Stroke>
);

export const HeartIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d={HEART} />
  </Stroke>
);

export function HeartFilledIcon({ size = 16, color = colors.story.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={HEART} />
    </Svg>
  );
}

export const MehIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M8 15h8M9 9.5h.01M15 9.5h.01" />
  </Stroke>
);

export const RotateIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <Path d="M3 3v5h5" />
  </Stroke>
);

export const SmileIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01" />
  </Stroke>
);

export const CloudIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </Stroke>
);

export const ZapIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </Stroke>
);

export const CloseIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
);

export const ShareIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <Path d="M16 6l-4-4-4 4M12 2v13" />
  </Stroke>
);

export const BackIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M15 18l-6-6 6-6" />
  </Stroke>
);

export const MenuIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M4 6h16M4 12h16M4 18h10" />
  </Stroke>
);

export const SendIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <Path d="M22 2L11 13" />
    <Path d="M22 2l-7 20-4-9-9-4z" />
  </Stroke>
);

export const CheckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Path d="M5 12l5 5L20 7" />
  </Stroke>
);

export const SettingsIcon = (p: IconProps) => (
  <Stroke {...p}>
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Stroke>
);
