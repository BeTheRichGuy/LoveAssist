import { View } from 'react-native';

import { StylePicker } from '@/components/style-picker';
import { AppText } from '@/components/text';
import { Button, QuestionHeader, Screen, StepBar } from '@/components/ui';
import { resetTo } from '@/navigation/reset-to';
import { useAppState } from '@/state/app-state';

export default function StyleQuestion() {
  const { state, dispatch } = useAppState();
  const style = state.onboarding.style;

  return (
    <Screen
      footer={
        <>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            설정에서 언제든 바꿀 수 있어요 · 캐릭터는 AI 연습 상대예요
          </AppText>
          <Button
            label={style === 'story' ? '스토리 모드로 시작' : '스코어 모드로 시작'}
            onPress={() => {
              dispatch({ type: 'completeOnboarding' });
              resetTo('/analyze');
            }}
          />
        </>
      }
    >
      <View style={{ gap: 24 }}>
        <StepBar step={3} total={3} />
        <QuestionHeader
          step={3}
          total={3}
          title={'어떤 화면으로\n연습할까요?'}
          description="채점과 조언은 똑같아요. 보는 방식만 달라져요."
        />
        <StylePicker value={style} onChange={(s) => dispatch({ type: 'setStyle', style: s })} />
      </View>
    </Screen>
  );
}
