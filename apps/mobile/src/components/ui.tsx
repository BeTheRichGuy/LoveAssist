import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, MIN_TOUCH, radius } from '@/theme/tokens';

import { AppText } from './text';

/** 화면 기본 틀: 안전 영역 + 배경 + 하단 고정 영역(footer) */
export function Screen({
  children,
  footer,
  scroll = false,
  padded = true,
  background = colors.bg,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
}) {
  const body = padded ? styles.padded : null;
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: background }]}
      edges={['top', 'bottom']}
    >
      {/* 안드로이드는 edge-to-edge라 키보드가 떠도 창이 줄지 않는다. 두 플랫폼 모두 padding으로 밀어 올린다 */}
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[body, styles.scrollBody]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, body]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 글자 앞 아이콘 (색은 버튼 글자색에 맞춰 넘긴다) */
  icon?: (color: string) => ReactNode;
};

export function Button({
  label,
  variant = 'primary',
  loading,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const textColor = isPrimary
    ? colors.onAccent
    : variant === 'danger'
      ? colors.warning
      : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon?.(textColor)}
          <AppText style={{ fontFamily: fonts.bold, fontSize: 16 }} color={textColor}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/** 상단 진행 막대 (STEP n / total) */
export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.stepSeg, { backgroundColor: i < step ? colors.accent : colors.border }]}
        />
      ))}
    </View>
  );
}

/** 질문 화면 머리말 */
export function QuestionHeader({
  step,
  total,
  title,
  description,
}: {
  step: number;
  total: number;
  title: string;
  description?: string;
}) {
  return (
    <View style={{ gap: 12 }}>
      <AppText variant="label">
        STEP {step} / {total}
      </AppText>
      <AppText variant="display" style={{ fontSize: 32, lineHeight: 42 }}>
        {title}
      </AppText>
      {description ? <AppText color={colors.textSub}>{description}</AppText> : null}
    </View>
  );
}

/** 아이콘 + 제목 + 설명을 가진 선택 카드 */
export function OptionCard({
  icon,
  title,
  description,
  selected,
  onPress,
  style,
}: {
  icon?: (color: string) => ReactNode;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? icon(selected ? colors.accent : colors.textSub) : null}
      <View style={{ gap: 4 }}>
        <AppText style={{ fontFamily: fonts.bold, fontSize: 17 }}>{title}</AppText>
        {description ? <AppText variant="caption">{description}</AppText> : null}
      </View>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** 작은 칩 (성향 · 관계 단계 표시) */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <AppText
      style={{ fontFamily: fonts.medium, fontSize: 13 }}
      color={selected ? colors.onAccent : colors.textSoft}
    >
      {label}
    </AppText>
  );
  const style = [styles.chip, selected && styles.chipSelected];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [style, styles.chipTouch, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

/**
 * 화면 위에 덮는 레이어. React Native Modal은 웹 미리보기에서 터치가 아래 화면으로 새서
 * 화면 안의 절대 위치 View로 대신한다. 화면 최상위(Screen 바깥)에 두어야 한다.
 */
export function Overlay({
  visible,
  children,
  background = 'rgba(12,11,16,0.92)',
}: {
  visible: boolean;
  children: ReactNode;
  background?: string;
}) {
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: background }]}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** 아이콘만 있는 44px 버튼 */
export function IconButton({
  label,
  onPress,
  children,
  style,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  padded: { paddingHorizontal: 24, paddingTop: 16 },
  scrollBody: { paddingBottom: 24, gap: 16 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 12 },
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { borderWidth: 1, borderColor: colors.border },
  buttonDanger: { borderWidth: 1, borderColor: colors.warning },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  stepBar: { flexDirection: 'row', gap: 6 },
  stepSeg: { flex: 1, height: 4, borderRadius: 2 },
  option: {
    minHeight: 132,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  chipTouch: { minHeight: MIN_TOUCH - 8, justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  iconButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { zIndex: 10, elevation: 10 },
});
