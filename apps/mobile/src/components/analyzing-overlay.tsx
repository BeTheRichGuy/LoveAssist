import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

import { CheckIcon, SparkleIcon } from './icons';
import { AppText } from './text';
import { Overlay } from './ui';

// 감정소 판독 대기 화면 (보통 5~10초). 실제 진행률을 알 수 없어서 단계 문구를 시간에 맞춰 넘기고,
// 마지막 단계에서는 응답이 올 때까지 멈춰 있는다.
const STEPS = [
  '대화를 읽고 있어요',
  '상대 기분을 살피는 중이에요',
  '말속에 숨은 뜻을 해석하는 중이에요',
  '내 말투에 맞는 답장을 고르는 중이에요',
];
const STEP_MS = 2200;

export function AnalyzingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  // 보일 때마다 새로 마운트돼서 단계가 처음부터 시작된다
  return <Steps />;
}

function Steps() {
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    const slowTimer = setTimeout(() => setSlow(true), 14_000);
    return () => {
      clearInterval(timer);
      clearTimeout(slowTimer);
    };
  }, []);

  return (
    <Overlay visible background="rgba(12,11,16,0.94)">
      <View style={styles.center} accessibilityLiveRegion="polite">
        <View style={styles.badge}>
          <SparkleIcon size={28} color={colors.accent} />
        </View>
        <AppText variant="title">감정 판독 중</AppText>
        <View style={styles.list}>
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <View key={label} style={styles.row}>
                <View style={styles.mark}>
                  {done ? (
                    <CheckIcon size={16} color={colors.accent} strokeWidth={3} />
                  ) : current ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <View style={styles.dot} />
                  )}
                </View>
                <AppText
                  style={{ fontSize: 15, fontFamily: current ? fonts.bold : fonts.body }}
                  color={done || current ? colors.text : colors.muted}
                >
                  {label}
                </AppText>
              </View>
            );
          })}
        </View>
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          {slow
            ? '조금 오래 걸리고 있어요. 대화가 길면 더 걸릴 수 있어요'
            : '보통 5~10초 걸려요 · 이름은 가려서 보냈어요'}
        </AppText>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { alignSelf: 'stretch', gap: 14, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 28 },
  mark: { width: 24, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
});
