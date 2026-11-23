import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckIcon, HeartIcon, SendIcon, SparkleIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, Card, Screen } from '@/components/ui';
import { useAppState } from '@/state/app-state';
import { colors, fonts, MIN_TOUCH } from '@/theme/tokens';

const FEATURES = [
  {
    icon: SparkleIcon,
    title: '답장 감정소',
    body: '받은 카톡의 기분과 속뜻을 읽고 답장을 추천해요',
  },
  { icon: SendIcon, title: '대화 연습', body: '보내기 전에 답장 점수와 개선점을 알려 드려요' },
  {
    icon: HeartIcon,
    title: '기억하는 어시스턴트',
    body: '상대의 성향과 메모를 기억해서 더 정확해져요',
  },
];

// 온보딩 첫 화면: 서비스 소개 + 성인 확인 · AI 고지 · 개인정보 안내 (규제상 필수)
export default function Welcome() {
  const { dispatch } = useAppState();
  const [agreed, setAgreed] = useState(false);

  return (
    <Screen
      scroll
      footer={
        <Button
          label="시작하기"
          disabled={!agreed}
          onPress={() => {
            dispatch({ type: 'consent' });
            router.push('/onboarding/stage');
          }}
        />
      }
    >
      <View style={{ gap: 12, marginTop: 24 }}>
        <AppText variant="label">연애 종합 솔루션</AppText>
        <AppText variant="display" style={{ fontSize: 34, lineHeight: 44 }}>
          썸부터 연애까지,{'\n'}혼자 고민하지 마세요
        </AppText>
        <AppText color={colors.textSub}>
          답장 해석부터 대화 연습까지, 관계의 모든 단계를 같이 고민해요.
        </AppText>
      </View>

      <View style={{ gap: 10 }}>
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <View key={title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icon size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyBold">{title}</AppText>
              <AppText variant="caption">{body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <Card style={{ gap: 10 }}>
        <AppText variant="bodyBold">시작하기 전에</AppText>
        <AppText style={styles.notice} color={colors.textSoft}>
          • AI가 대화를 분석하고 답장을 추천하는 서비스예요. 결과는 참고용이에요.
        </AppText>
        <AppText style={styles.notice} color={colors.textSoft}>
          • 기록은 이 기기에만 저장돼요. 분석할 때는 이름을 가린 대화만 미국 AI 서버(Anthropic)로
          보내고, 원문은 분석 후 바로 지워요. 보낸 내용은 AI 학습에 쓰지 않아요.
        </AppText>
        <AppText style={styles.notice} color={colors.textSoft}>
          • 만 19세 이상만 이용할 수 있어요.
        </AppText>
      </Card>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed((v) => !v)}
        style={styles.agreeRow}
      >
        <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
          {agreed ? <CheckIcon size={16} color={colors.onAccent} strokeWidth={3} /> : null}
        </View>
        <AppText style={{ flex: 1, fontFamily: fonts.medium }}>
          만 19세 이상이며, 위 안내를 확인했어요
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { fontSize: 14, lineHeight: 22 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
