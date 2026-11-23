import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BackIcon } from '@/components/icons';
import { SecurityPanel } from '@/components/security-panel';
import { StylePicker } from '@/components/style-picker';
import { AppText } from '@/components/text';
import { Button, Card, IconButton, Screen } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { resetTo } from '@/navigation/reset-to';
import { crashReportingEnabled, sendTestCrash } from '@/services/crash-report';
import { useAppState } from '@/state/app-state';
import { colors } from '@/theme/tokens';

export default function Settings() {
  const { state, dispatch } = useAppState();
  const [sentTestCrash, setSentTestCrash] = useState(false);

  async function resetAll() {
    const ok = await confirmAction(
      '처음부터 다시',
      '온보딩부터 다시 시작해요. 입력한 내용은 모두 지워져요.',
      '다시 시작',
    );
    if (!ok) return;
    dispatch({ type: 'resetAll' });
    resetTo('/onboarding/welcome');
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton label="뒤로" onPress={() => router.back()} style={{ marginLeft: -12 }}>
          <BackIcon size={22} />
        </IconButton>
        <AppText variant="title">설정</AppText>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ gap: 12 }}>
        <AppText variant="bodyBold">연습 화면 스타일</AppText>
        <StylePicker
          value={state.onboarding.style}
          onChange={(s) => dispatch({ type: 'setStyle', style: s })}
        />
        <AppText variant="caption">
          스토리 모드의 캐릭터 그림은 준비 중이에요. 지금은 자리 표시로 보여요.
        </AppText>
      </View>

      <Button
        label="말투 학습하기"
        variant="secondary"
        onPress={() => router.push('/style-learn')}
      />
      <Button label="내 말투" variant="secondary" onPress={() => router.push('/my-style')} />
      <Button
        label="스토리 모드 캐릭터"
        variant="secondary"
        onPress={() => router.push('/characters')}
      />

      <SecurityPanel />

      <Card style={{ gap: 8 }}>
        <AppText variant="bodyBold">안내</AppText>
        <AppText style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
          AI 기반 서비스예요. 분석과 점수는 참고용이에요. 기록은 이 기기에만 저장돼요.
        </AppText>
        <Button
          label="개인정보 처리방침"
          variant="secondary"
          onPress={() => router.push('/privacy')}
        />
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText variant="bodyBold">테스트용</AppText>
        <AppText variant="caption">
          지인 테스트 버전이에요. 온보딩 답변과 상대 정보는 이 기기에 암호화해서 저장돼요. 처음부터
          다시 하면 모두 지워져요.
        </AppText>
        {crashReportingEnabled ? (
          <Button
            label="크래시 리포트 테스트 오류 보내기"
            variant="secondary"
            onPress={() => {
              sendTestCrash();
              setSentTestCrash(true);
            }}
          />
        ) : null}
        {sentTestCrash ? (
          <AppText variant="caption">
            보냈어요. Sentry에서 메시지가 [제거됨]으로 보이면 정상이에요.
          </AppText>
        ) : null}
        <Button label="처음부터 다시 하기" variant="danger" onPress={resetAll} />
      </Card>
    </Screen>
  );
}
