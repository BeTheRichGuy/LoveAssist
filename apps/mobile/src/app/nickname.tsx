import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BackIcon, CheckIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, Chip, IconButton, Screen } from '@/components/ui';
import { useAppState } from '@/state/app-state';
import { colors, fonts, MIN_TOUCH, radius } from '@/theme/tokens';

const NICKNAME_IDEAS = ['코코', '봄이', '별', '콩이'];
const MAX_NICKNAME = 10;

// ③ 닉네임 짓기 + 감정소가 제안한 성향 승인. 승인한 성향만 저장한다 (3층 메모리의 "요약" 층)
export default function Nickname() {
  const { state, dispatch } = useAppState();
  const [nickname, setNickname] = useState('');
  const [traits, setTraits] = useState(() =>
    (state.lastAnalysis?.traitSuggestions ?? []).map((text) => ({ text, approved: false })),
  );

  const name = nickname.trim();

  return (
    <Screen
      scroll
      footer={
        <Button
          label="다음"
          disabled={name.length === 0}
          onPress={() => {
            dispatch({
              type: 'createPartner',
              nickname: name,
              traits: traits.filter((t) => t.approved && t.text.trim()).map((t) => t.text.trim()),
            });
            router.replace('/partner-info');
          }}
        />
      }
    >
      <IconButton label="뒤로" onPress={() => router.back()} style={{ marginLeft: -12 }}>
        <BackIcon size={22} />
      </IconButton>
      <View style={{ gap: 12 }}>
        <AppText variant="label">프로필 만들기 1 / 2</AppText>
        <AppText variant="display" style={{ fontSize: 30, lineHeight: 40 }}>
          이 사람을{'\n'}뭐라고 부를까요?
        </AppText>
        <AppText color={colors.textSub}>
          실명 대신 별명을 지어 주세요. AI에는 이 닉네임만 전달돼요.
        </AppText>
      </View>

      <TextInput
        value={nickname}
        onChangeText={(t) => setNickname(t.slice(0, MAX_NICKNAME))}
        placeholder="닉네임 (최대 10자)"
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="done"
      />
      <View style={styles.chips}>
        {NICKNAME_IDEAS.map((n) => (
          <Chip key={n} label={n} selected={name === n} onPress={() => setNickname(n)} />
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 8 }}>
        <AppText variant="bodyBold">감정소가 발견한 성향</AppText>
        <AppText variant="caption">
          기억할 것만 체크해 주세요. 체크한 것만 저장되고, 문장은 눌러서 고칠 수 있어요.
        </AppText>
        {traits.length === 0 ? (
          <AppText variant="caption">아직 제안된 성향이 없어요.</AppText>
        ) : (
          traits.map((t, i) => (
            <View key={i} style={[styles.trait, t.approved && styles.traitOn]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: t.approved }}
                accessibilityLabel={`${t.text} 저장`}
                onPress={() =>
                  setTraits((prev) =>
                    prev.map((p, j) => (j === i ? { ...p, approved: !p.approved } : p)),
                  )
                }
                style={styles.checkTouch}
              >
                <View style={[styles.check, t.approved && styles.checkOn]}>
                  {t.approved ? (
                    <CheckIcon size={14} color={colors.onAccent} strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
              <TextInput
                value={t.text}
                onChangeText={(text) =>
                  setTraits((prev) => prev.map((p, j) => (j === i ? { ...p, text } : p)))
                }
                style={styles.traitInput}
                multiline
              />
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 16,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingRight: 14,
  },
  traitOn: { borderColor: colors.accent },
  checkTouch: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  traitInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: 12,
  },
});
