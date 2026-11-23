import { router } from 'expo-router';
import { View } from 'react-native';

import { CloudIcon, SmileIcon, ZapIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, OptionCard, QuestionHeader, Screen, StepBar } from '@/components/ui';
import { CONFLICT_OPTIONS } from '@/lib/labels';
import { useAppState } from '@/state/app-state';

const ICONS = { none: SmileIcon, some: CloudIcon, serious: ZapIcon };

export default function ConflictQuestion() {
  const { state, dispatch } = useAppState();
  const selected = state.onboarding.conflict;

  return (
    <Screen
      footer={
        <>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            갈등이 있으면 감정소가 화해에 초점을 맞춰 분석해요
          </AppText>
          <Button
            label="다음"
            disabled={!selected}
            onPress={() => router.push('/onboarding/style')}
          />
        </>
      }
    >
      <View style={{ gap: 28 }}>
        <StepBar step={2} total={3} />
        <QuestionHeader
          step={2}
          total={3}
          title={'요즘 그 사람과\n갈등이 있나요?'}
          description="솔직하게 골라 주세요. 언제든 바꿀 수 있어요."
        />
        <View style={{ gap: 12 }}>
          {CONFLICT_OPTIONS.map((o) => {
            const Icon = ICONS[o.value];
            return (
              <OptionCard
                key={o.value}
                style={{
                  minHeight: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 16,
                }}
                icon={(color) => <Icon size={26} color={color} />}
                title={o.title}
                description={o.description}
                selected={selected === o.value}
                onPress={() => dispatch({ type: 'setConflict', conflict: o.value })}
              />
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
