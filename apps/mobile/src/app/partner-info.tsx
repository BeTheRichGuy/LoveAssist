import type { RelationshipStage } from '@loveassist/shared';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/text';
import { Button, Chip, Screen } from '@/components/ui';
import { withIGa } from '@/lib/korean';
import { STAGE_OPTIONS } from '@/lib/labels';
import { resetTo } from '@/navigation/reset-to';
import { alive, MEMO_LABELS, useAppState, type MemoKind } from '@/state/app-state';
import { colors, fonts, radius } from '@/theme/tokens';

const PLACEHOLDERS: Record<MemoKind, string> = {
  anniversary: '예: 10월 3일 처음 만남',
  likes: '예: 전시, 디저트, 고양이',
  dislikes: '예: 사람 많은 곳, 늦은 답장',
  free: '예: 아침엔 연락이 느린 편',
};
const KINDS: MemoKind[] = ['anniversary', 'likes', 'dislikes', 'free'];

// ④ 상대 정보 입력: 사용자가 직접 쓰는 메모 층. 프로필 화면에서 다시 열어 고칠 수도 있다
export default function PartnerInfo() {
  const { state, dispatch } = useAppState();
  // 프로필 화면에서 열면 ?mode=edit (저장 후 뒤로), 첫 흐름에서는 저장 후 메인으로
  const editing = useLocalSearchParams<{ mode?: string }>().mode === 'edit';
  const partner = state.partner;
  const [stage, setStage] = useState<RelationshipStage>(partner?.stage ?? 'some');
  const [memos, setMemos] = useState<Record<MemoKind, string>>(() => {
    const init = { anniversary: '', likes: '', dislikes: '', free: '' };
    for (const m of partner ? alive(partner.memos) : []) init[m.kind] = m.text;
    return init;
  });

  if (!partner) return <Redirect href="/analyze" />;

  function save() {
    dispatch({
      type: 'updatePartner',
      stage,
      memos: KINDS.filter((k) => memos[k].trim()).map((k) => ({ kind: k, text: memos[k].trim() })),
    });
    if (editing) router.back();
    else resetTo('/home');
  }

  return (
    <Screen
      scroll
      footer={
        <>
          <Button label={editing ? '저장' : '메인으로'} onPress={save} />
          {editing ? null : (
            <Button label="나중에 할게요" variant="ghost" onPress={() => resetTo('/home')} />
          )}
        </>
      }
    >
      <View style={{ gap: 12, marginTop: 24 }}>
        <AppText variant="label">{editing ? '상대 정보' : '프로필 만들기 2 / 2'}</AppText>
        <AppText variant="display" style={{ fontSize: 30, lineHeight: 40 }}>
          {withIGa(partner.nickname)} 어떤 사람인지{'\n'}알려 주세요
        </AppText>
        <AppText color={colors.textSub}>
          많이 적을수록 연습이 정확해져요. 모두 선택 사항이에요.
        </AppText>
      </View>

      <View style={{ gap: 10 }}>
        <AppText variant="bodyBold">관계 단계</AppText>
        <View style={styles.chips}>
          {STAGE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.title}
              selected={stage === o.value}
              onPress={() => setStage(o.value)}
            />
          ))}
        </View>
      </View>

      {KINDS.map((k) => (
        <View key={k} style={{ gap: 8 }}>
          <AppText variant="bodyBold">{MEMO_LABELS[k]}</AppText>
          <TextInput
            value={memos[k]}
            onChangeText={(t) => setMemos((m) => ({ ...m, [k]: t.slice(0, 200) }))}
            placeholder={PLACEHOLDERS[k]}
            placeholderTextColor={colors.muted}
            multiline={k === 'free'}
            style={[styles.input, k === 'free' && { minHeight: 96, textAlignVertical: 'top' }]}
          />
        </View>
      ))}

      <AppText variant="caption" color={colors.warning}>
        건강 · 종교 · 성생활 같은 민감한 정보는 적지 말아 주세요.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
