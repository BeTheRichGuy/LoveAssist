import type { AnalyzeResult } from '@loveassist/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { SIGNAL_LEVEL_LABEL } from '@/lib/labels';
import { colors, fonts, radius } from '@/theme/tokens';

import { AppText } from './text';

const barColor = (label: string, level: string) => {
  if (/서운|화남|망설/.test(label)) return colors.warning;
  if (level === 'high') return colors.accent;
  return colors.muted;
};

/** 상대 기분 지표 막대 + 의미 해석 */
export function SignalCard({ result }: { result: AnalyzeResult }) {
  return (
    <View style={styles.card}>
      <AppText style={{ fontSize: 14 }} color={colors.textSub}>
        &quot;{result.focusMessage}&quot;
      </AppText>
      <View style={{ gap: 10 }}>
        {result.signals.map((s) => (
          <View key={s.label} style={styles.signalRow}>
            <AppText style={styles.signalLabel}>{s.label}</AppText>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.round(s.value * 100)}%`,
                    backgroundColor: barColor(s.label, s.level),
                  },
                ]}
              />
            </View>
            <AppText style={styles.signalLevel}>{SIGNAL_LEVEL_LABEL[s.level]}</AppText>
          </View>
        ))}
      </View>
      <AppText style={{ fontSize: 14, lineHeight: 23 }} color={colors.textSoft}>
        {result.interpretation}
      </AppText>
    </View>
  );
}

/** 추천 답장 한 줄 (예상 점수 + 문장). 누르면 복사 */
export function ReplyOption({
  text,
  score,
  highlighted,
  onPress,
}: {
  text: string;
  /** null이면 채점 중 */
  score: number | null;
  highlighted?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="답장을 복사해요"
      onPress={onPress}
      style={({ pressed }) => [
        styles.reply,
        highlighted && { borderColor: colors.accent },
        pressed && { opacity: 0.75 },
      ]}
    >
      <AppText
        style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, width: 40 }}
        color={highlighted ? colors.accent : score === null ? colors.muted : colors.textSoft}
        accessibilityLabel={score === null ? '채점 중' : `${score}점`}
      >
        {score ?? '··'}
      </AppText>
      <AppText style={{ flex: 1 }}>{text}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signalLabel: { width: 76, fontSize: 13 },
  signalLevel: { width: 32, textAlign: 'right', fontSize: 13, fontFamily: fonts.bold },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: 10, borderRadius: 5 },
  reply: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
});
