import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BackIcon, CloseIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Card, Chip, IconButton, Screen } from '@/components/ui';
import { useAppState } from '@/state/app-state';
import { colors, fonts, MIN_TOUCH, radius } from '@/theme/tokens';

const MAX_STYLE = 6;

// 내 말투: 승인한 말투 요약을 보고 지우고 직접 추가한다. 대화 파일 학습은 말투 학습하기(style-learn.tsx)에서.
export default function MyStyleScreen() {
  const { state, dispatch } = useAppState();
  const [manual, setManual] = useState('');

  const full = state.myStyle.length >= MAX_STYLE;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton label="뒤로" onPress={() => router.back()} style={{ marginLeft: -12 }}>
          <BackIcon size={22} />
        </IconButton>
        <AppText variant="title">내 말투</AppText>
        <View style={{ width: 44 }} />
      </View>
      <AppText color={colors.textSub}>
        추천 답장과 채점의 대안 답장을 내 말투로 맞춰요. 승인한 요약만 이 기기에 저장돼요.
      </AppText>

      <Card style={{ gap: 10 }}>
        <AppText variant="bodyBold">저장된 내 말투</AppText>
        {state.myStyle.length === 0 ? (
          <AppText variant="caption">
            아직 없어요. 없으면 붙여넣은 대화 속 내 말투를 그때그때 따라 써요.
          </AppText>
        ) : (
          state.myStyle.map((s) => (
            <View key={s} style={styles.row}>
              <AppText style={{ flex: 1 }}>{s}</AppText>
              <IconButton
                label={`${s} 지우기`}
                onPress={() =>
                  dispatch({ type: 'setMyStyle', style: state.myStyle.filter((x) => x !== s) })
                }
              >
                <CloseIcon size={18} color={colors.textSub} />
              </IconButton>
            </View>
          ))
        )}
        <View style={styles.row}>
          <TextInput
            value={manual}
            onChangeText={(t) => setManual(t.slice(0, 40))}
            placeholder={
              full ? `최대 ${MAX_STYLE}개까지 저장돼요` : '직접 추가 (예: 반말, 짧게 끊어 보냄)'
            }
            placeholderTextColor={colors.muted}
            editable={!full}
            style={styles.input}
          />
          <Chip
            label="추가"
            onPress={() => {
              if (!manual.trim() || full) return;
              dispatch({ type: 'setMyStyle', style: [...state.myStyle, manual.trim()] });
              setManual('');
            }}
          />
        </View>
      </Card>

      <AppText variant="caption">
        대화 파일로 학습하려면 설정 → 말투 학습하기에서 내 말투 · 상대 말투를 골라 배울 수 있어요.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
