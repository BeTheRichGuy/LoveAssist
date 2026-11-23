import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HeartIcon, MehIcon, RotateIcon, SparkleIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, OptionCard, QuestionHeader, Screen, StepBar } from '@/components/ui';
import { STAGE_OPTIONS } from '@/lib/labels';
import { useAppState } from '@/state/app-state';

const ICONS = { some: SparkleIcon, dating: HeartIcon, slump: MehIcon, breakup: RotateIcon };

export default function StageQuestion() {
  const { state, dispatch } = useAppState();
  const selected = state.onboarding.stage;

  return (
    <Screen
      footer={
        <>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            AI 기반 서비스 · 만 19세 이상 · 기록은 이 기기에만 저장
          </AppText>
          <Button
            label="다음"
            disabled={!selected}
            onPress={() => router.push('/onboarding/conflict')}
          />
        </>
      }
    >
      <View style={{ gap: 28 }}>
        <StepBar step={1} total={3} />
        <QuestionHeader
          step={1}
          total={3}
          title={'지금 당신의\n연애 스테이지는?'}
          description="고른 단계에 맞춰 채점 기준이 달라져요."
        />
        <View style={styles.grid}>
          {STAGE_OPTIONS.map((o) => {
            const Icon = ICONS[o.value];
            return (
              <OptionCard
                key={o.value}
                style={styles.cell}
                icon={(color) => <Icon size={26} color={color} />}
                title={o.title}
                description={o.description}
                selected={selected === o.value}
                onPress={() => dispatch({ type: 'setStage', stage: o.value })}
              />
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47.5%', flexGrow: 1 },
});
