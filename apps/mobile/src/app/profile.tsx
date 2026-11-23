import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BackIcon, CloseIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { withIGa, withWaGwa } from '@/lib/korean';
import { stageTitle } from '@/lib/labels';
import { resetTo } from '@/navigation/reset-to';
import {
  alive,
  MEMO_LABELS,
  traitsOf,
  useAppState,
  type Trait,
  type TraitKind,
} from '@/state/app-state';
import { colors, fonts, radius } from '@/theme/tokens';

const MAX_TRAIT = 100;

// 상대 프로필: 성향(요약 층)과 메모(메모 층) 보기 · 수정 · 일괄 삭제
// - 성향: 상대가 "어떻게 반응하는 사람인지" / 말투: 상대가 "어떤 말투로 말하는지" (둘 다 승인하거나 직접 적은 것만)
// - 메모: 상대에 대한 "사실". 기념일 · 좋아하는 것처럼 내가 직접 적는다
export default function Profile() {
  const { state, dispatch } = useAppState();
  const partner = state.partner;
  if (!partner) return <Redirect href="/analyze" />;
  const memos = alive(partner.memos);

  async function wipe() {
    const ok = await confirmAction(
      '정리하기',
      `${withWaGwa(partner!.nickname)} 관련된 성향, 메모, 연습 기록을 모두 지워요. 되돌릴 수 없어요.`,
      '모두 지우기',
    );
    if (!ok) return;
    dispatch({ type: 'wipePartner' });
    resetTo('/analyze');
  }

  return (
    <Screen
      scroll
      footer={<Button label="정리하기 (모두 지우기)" variant="danger" onPress={wipe} />}
    >
      <View style={styles.header}>
        <IconButton label="뒤로" onPress={() => router.back()} style={{ marginLeft: -12 }}>
          <BackIcon size={22} />
        </IconButton>
        <AppText variant="title">프로필</AppText>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="display" style={{ fontSize: 30, lineHeight: 38 }}>
          {partner.nickname}
        </AppText>
        <AppText color={colors.textSub}>{stageTitle(partner.stage)}</AppText>
      </View>

      <TraitSection
        kind="trait"
        title="성향 · 반응하는 방식"
        caption={`${withIGa(partner.nickname)} 어떻게 반응하고 대화하는 사람인지예요. 감정소가 찾아 준 것 중 승인한 것과 내가 직접 적은 것이 저장돼요. 눌러서 고칠 수 있어요.`}
        placeholder="직접 추가 (예: 답장이 느린 편)"
      />
      <TraitSection
        kind="speech"
        title="말투"
        caption={`${withIGa(partner.nickname)} 쓰는 말투예요. 대화 연습에서 이 말투로 말해요. 설정 → 말투 학습하기에서 대화 파일로 배울 수 있어요.`}
        placeholder="직접 추가 (예: 반말에 ㅎㅎ를 자주 씀)"
      />

      <Card>
        <View style={{ gap: 2 }}>
          <AppText variant="bodyBold">메모 · 알고 있는 사실</AppText>
          <AppText variant="caption">기념일 · 좋아하는 것처럼 내가 직접 적는 정보예요.</AppText>
        </View>
        {memos.length === 0 ? (
          <AppText variant="caption">아직 없어요.</AppText>
        ) : (
          memos.map((m) => (
            <View key={m.id} style={{ gap: 2 }}>
              <AppText variant="caption">{MEMO_LABELS[m.kind]}</AppText>
              <AppText>{m.text}</AppText>
            </View>
          ))
        )}
        <Button
          label="메모 · 관계 단계 고치기"
          variant="secondary"
          onPress={() => router.push({ pathname: '/partner-info', params: { mode: 'edit' } })}
        />
      </Card>

      <AppText variant="caption" color={colors.warning}>
        건강 · 종교 · 성생활 같은 민감한 정보는 적지 말아 주세요.
      </AppText>
    </Screen>
  );
}

/** 성향 또는 말투 목록: 고치기 · 지우기 · 직접 추가 */
function TraitSection({
  kind,
  title,
  caption,
  placeholder,
}: {
  kind: TraitKind;
  title: string;
  caption: string;
  placeholder: string;
}) {
  const { state, dispatch } = useAppState();
  const [draft, setDraft] = useState('');
  const items = state.partner ? traitsOf(state.partner, kind) : [];
  function add() {
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'addTraits', traits: [text], kind });
    setDraft('');
  }
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <AppText variant="bodyBold">{title}</AppText>
        <AppText variant="caption">{caption}</AppText>
      </View>
      {items.length === 0 ? <AppText variant="caption">아직 없어요.</AppText> : null}
      {items.map((t) => (
        <TraitRow
          key={t.id}
          trait={t}
          onSave={(text) => dispatch({ type: 'updateTrait', id: t.id, text })}
          onRemove={() => dispatch({ type: 'removeTrait', id: t.id })}
        />
      ))}
      <View style={styles.row}>
        <TextInput
          value={draft}
          onChangeText={(v) => setDraft(v.slice(0, MAX_TRAIT))}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={[styles.input, { flex: 1 }]}
        />
        <Chip label="추가" onPress={add} />
      </View>
    </Card>
  );
}

/** 성향 한 줄. 바로 고칠 수 있고, 입력을 마치면 저장한다 (비우면 원래대로) */
function TraitRow({
  trait,
  onSave,
  onRemove,
}: {
  trait: Trait;
  onSave: (text: string) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(trait.text);
  function commit() {
    const next = text.trim();
    if (!next) setText(trait.text);
    else if (next !== trait.text) onSave(next);
  }
  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={(v) => setText(v.slice(0, MAX_TRAIT))}
        onEndEditing={commit}
        onBlur={commit}
        multiline
        accessibilityLabel={`성향: ${trait.text}`}
        style={[styles.input, { flex: 1 }]}
      />
      <IconButton label={`${trait.text} 지우기`} onPress={onRemove}>
        <CloseIcon size={18} color={colors.textSub} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
