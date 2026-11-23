import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsIcon, SparkleIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { withWaGwa } from '@/lib/korean';
import { stageTitle } from '@/lib/labels';
import { traitsOf, useAppState } from '@/state/app-state';
import { colors, fonts, radius } from '@/theme/tokens';

// 메인: 상대 프로필 요약 + 대화 연습 진입 + 답장 감정소
export default function Home() {
  const { state } = useAppState();
  const partner = state.partner;
  if (!partner) return <Redirect href="/analyze" />;

  const traits = traitsOf(partner, 'trait');
  const { turns, scoreSum } = state.practice;
  const avg = turns ? Math.round(scoreSum / turns) : null;

  return (
    <Screen
      scroll
      footer={
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          지인 테스트 버전 · AI 결과는 참고용이에요 · 기록은 이 기기에만 저장
        </AppText>
      }
    >
      <View style={styles.header}>
        <AppText variant="display" style={{ fontSize: 26, lineHeight: 34 }}>
          연애 노트
        </AppText>
        <IconButton label="설정" onPress={() => router.push('/settings')}>
          <SettingsIcon size={22} color={colors.textSub} />
        </IconButton>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint="프로필을 열어요"
        onPress={() => router.push('/profile')}
        style={({ pressed }) => [styles.partner, pressed && { opacity: 0.8 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.avatar}>
            <AppText style={{ fontFamily: fonts.display, fontSize: 24 }} color={colors.accent}>
              {partner.nickname.slice(0, 1)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="title" style={{ fontSize: 22, lineHeight: 28 }}>
              {partner.nickname}
            </AppText>
            <AppText variant="caption">{stageTitle(partner.stage)} · 프로필 보기 ›</AppText>
          </View>
        </View>
        {traits.length > 0 ? (
          <View style={styles.chips}>
            {traits.slice(0, 3).map((t) => (
              <Chip key={t.id} label={t.text} />
            ))}
          </View>
        ) : (
          <AppText variant="caption">
            아직 기억한 성향이 없어요. 감정소를 쓰면 성향이 쌓여요.
          </AppText>
        )}
      </Pressable>

      <Card
        style={{
          backgroundColor: colors.accentSurface,
          borderWidth: 1,
          borderColor: colors.accent,
        }}
      >
        <View style={{ gap: 6 }}>
          <AppText variant="title">{withWaGwa(partner.nickname)} 대화 연습</AppText>
          <AppText style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
            보내기 전에 답장 점수와 개선점을 알려 드려요.
          </AppText>
          {avg !== null ? (
            <AppText variant="caption">
              지금까지 {turns}턴 · 평균 {avg}점
            </AppText>
          ) : null}
        </View>
        <Button label="연습 시작" onPress={() => router.push('/practice')} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SparkleIcon size={22} color={colors.accent} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyBold">답장 감정소</AppText>
            <AppText variant="caption">받은 카톡의 속뜻이 궁금할 때</AppText>
          </View>
        </View>
        <Button label="판독하기" variant="secondary" onPress={() => router.push('/analyze')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  partner: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
