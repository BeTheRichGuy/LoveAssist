import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { BackIcon, CheckIcon, SparkleIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { parseChat } from '@/lib/chat-parse';
import { pickChatFile, PICK_ERRORS, type PickResult } from '@/lib/file-pick';
import { withIGa } from '@/lib/korean';
import { describeAiError } from '@/lib/relay-client';
import { buildStyleSample, STYLE_MIN_MINE } from '@/lib/style-sample';
import { learnStyle } from '@/services/ai';
import { takeSharedChat } from '@/services/incoming-share';
import { alive, partnerContext, useAppState } from '@/state/app-state';
import { colors, fonts, MIN_TOUCH, radius } from '@/theme/tokens';

/** style = 내 말투 · speech = 상대 말투 · trait = 상대 소통 성향 */
type Suggestion = { text: string; kind: 'style' | 'speech' | 'trait'; approved: boolean };
type Target = 'me' | 'partner';

// 말투 학습하기: 카톡 · 라인 대화 파일로 내 말투 · 상대 말투(하나 또는 둘 다)를 학습한다.
// 파일은 직접 고르거나, 카톡 · 라인 "대화 내보내기 → 공유 → 이 앱"으로 받는다 (?shared=…).
// 파일 원문은 이 화면 메모리에만 있고, 분석이 끝나거나 취소하면 바로 지운다. 저장되는 것은 승인한 요약뿐이다.
export default function StyleLearnScreen() {
  const { state, dispatch } = useAppState();
  const { shared } = useLocalSearchParams<{ shared?: string }>();
  const ctx = partnerContext(state);
  const partner = state.partner;
  const [targets, setTargets] = useState<Record<Target, boolean>>({
    me: true,
    partner: partner !== null,
  });
  const [fileText, setFileText] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** 코치 한마디: 학습한 내 말투 중 상대에게 안 좋게 보일 수 있는 습관 (저장하지 않음) */
  const [tips, setTips] = useState<string[]>([]);

  const parsed = useMemo(() => (fileText ? parseChat(fileText) : null), [fileText]);
  const sample = useMemo(
    () => (parsed && me ? buildStyleSample(parsed, me, ctx.label) : null),
    [parsed, me, ctx.label],
  );
  const wantMe = targets.me;
  const wantPartner = targets.partner && partner !== null;
  // 고른 쪽의 메시지가 충분해야 말투를 판단할 수 있다
  const enough =
    sample !== null &&
    (!wantMe || sample.mine >= STYLE_MIN_MINE) &&
    (!wantPartner || sample.theirs >= STYLE_MIN_MINE);

  function loadFile(res: PickResult) {
    setNotice(null);
    setSuggestions(null);
    setMe(null);
    if (res.ok) {
      setFileText(res.text);
      setError(null);
    } else {
      setError(PICK_ERRORS[res.reason]);
    }
  }

  // 카톡 · 라인에서 공유로 들어오면 받은 파일을 바로 불러온다 (읽은 사본은 서비스가 지운다).
  // 이 화면을 연 채로 다시 공유받는 경우도 있어 앱이 앞으로 올 때마다 확인한다
  useEffect(() => {
    const check = () =>
      void takeSharedChat().then((res) => {
        if (res) loadFile(res);
      });
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [shared]);

  function discardFile() {
    setFileText(null);
    setMe(null);
  }

  async function analyze() {
    if (!sample) return;
    setBusy(true);
    setError(null);
    try {
      const result = await learnStyle({ lines: sample.lines, partnerLabel: ctx.label });
      // 분석이 끝나면 파일 원문은 바로 지운다 (설계 원칙)
      discardFile();
      const known = new Set(partner ? alive(partner.traits).map((t) => t.text) : []);
      const fresh = (xs: string[]) => xs.filter((t) => !known.has(t));
      setTips(wantMe ? (result.myStyleTips ?? []) : []);
      setSuggestions([
        ...(wantMe
          ? result.myStyle
              .filter((s) => !state.myStyle.includes(s))
              .map((text) => ({ text, kind: 'style' as const, approved: false }))
          : []),
        ...(wantPartner
          ? [
              ...fresh(result.partnerSpeech).map((text) => ({
                text,
                kind: 'speech' as const,
                approved: false,
              })),
              ...fresh(result.partnerTraits).map((text) => ({
                text,
                kind: 'trait' as const,
                approved: false,
              })),
            ]
          : []),
      ]);
    } catch (e) {
      setError(describeAiError(e));
    } finally {
      setBusy(false);
    }
  }

  function saveApproved() {
    if (!suggestions) return;
    const pick = (kind: Suggestion['kind']) =>
      suggestions.filter((s) => s.kind === kind && s.approved).map((s) => s.text);
    const style = pick('style');
    const traits = pick('trait');
    const speech = pick('speech');
    if (style.length) dispatch({ type: 'setMyStyle', style: [...state.myStyle, ...style] });
    if (traits.length) dispatch({ type: 'addTraits', traits, kind: 'trait' });
    if (speech.length) dispatch({ type: 'addTraits', traits: speech, kind: 'speech' });
    setSuggestions(null);
    const saved = style.length + traits.length + speech.length;
    setNotice(saved ? `${saved}개 저장했어요` : '아무것도 저장하지 않았어요');
  }

  const labelOf = (kind: Suggestion['kind']) =>
    kind === 'style'
      ? '내 말투'
      : `${partner?.nickname ?? '상대'} ${kind === 'speech' ? '말투' : '성향'}`;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton label="뒤로" onPress={() => router.back()} style={{ marginLeft: -12 }}>
          <BackIcon size={22} />
        </IconButton>
        <AppText variant="title">말투 학습하기</AppText>
        <View style={{ width: 44 }} />
      </View>
      <AppText color={colors.textSub}>
        카톡 · 라인 대화 파일로 말투를 배워요. 승인한 요약만 이 기기에 저장돼요.
      </AppText>

      <Card style={{ gap: 10 }}>
        <AppText variant="bodyBold">누구 말투를 배울까요?</AppText>
        <View style={styles.chips}>
          <Chip
            label="내 말투"
            selected={targets.me}
            onPress={() => setTargets((t) => ({ ...t, me: !t.me }))}
          />
          {partner ? (
            <Chip
              label={`${partner.nickname} 말투`}
              selected={targets.partner}
              onPress={() => setTargets((t) => ({ ...t, partner: !t.partner }))}
            />
          ) : null}
        </View>
        <AppText variant="caption">
          {wantMe && wantPartner
            ? '둘 다 배워요. 내 말투는 추천 답장에, 상대 말투는 대화 연습 상대에 쓰여요.'
            : wantMe
              ? '내 말투는 추천 답장 · 채점 대안을 내 말투로 맞추는 데 쓰여요.'
              : wantPartner
                ? `${withIGa(partner!.nickname)} 쓰는 말투로 대화 연습 상대가 말해요.`
                : '하나 이상 골라 주세요.'}
        </AppText>
      </Card>

      {suggestions ? (
        <Card style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <AppText variant="bodyBold">AI가 찾은 말투 · 성향</AppText>
            <AppText variant="caption">맞는 것만 체크해 주세요. 체크한 것만 저장돼요.</AppText>
          </View>
          {tips.length > 0 ? (
            <View style={styles.tips}>
              <AppText style={{ fontFamily: fonts.bold, fontSize: 13 }} color={colors.warning}>
                코치 한마디
              </AppText>
              {tips.map((t) => (
                <AppText key={t} style={{ fontSize: 14, lineHeight: 21 }}>
                  {t}
                </AppText>
              ))}
              <AppText variant="caption">
                추천 답장과 채점은 이런 습관을 줄인 버전으로 도와드려요.
              </AppText>
            </View>
          ) : null}
          {suggestions.length === 0 ? (
            <AppText variant="caption">새로 찾은 게 없어요. 이미 저장된 것과 같아요.</AppText>
          ) : (
            suggestions.map((s, i) => (
              <Pressable
                key={`${s.kind}-${s.text}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: s.approved }}
                onPress={() =>
                  setSuggestions((prev) =>
                    prev!.map((p, j) => (j === i ? { ...p, approved: !p.approved } : p)),
                  )
                }
                style={[styles.suggestion, s.approved && { borderColor: colors.accent }]}
              >
                <View style={[styles.check, s.approved && styles.checkOn]}>
                  {s.approved ? (
                    <CheckIcon size={14} color={colors.onAccent} strokeWidth={3} />
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="caption" color={colors.accent}>
                    {labelOf(s.kind)}
                  </AppText>
                  <AppText>{s.text}</AppText>
                </View>
              </Pressable>
            ))
          )}
          <Button label="선택한 것 저장" onPress={saveApproved} />
        </Card>
      ) : (
        <Card style={{ gap: 12 }}>
          <AppText variant="bodyBold">대화 파일</AppText>
          {fileText === null ? (
            <>
              <AppText style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
                가장 쉬운 방법: 카톡 · 라인 대화방 → 설정 → 대화 내보내기 → 공유 목록에서 이 앱을
                고르면 바로 여기로 와요.
              </AppText>
              <AppText variant="caption">
                파일로 저장했다면 아래에서 불러와도 돼요. 파일 원문은 읽은 직후 지우고, 이름을 가린
                최근 대화 일부만 AI로 보내요.
              </AppText>
            </>
          ) : null}
          <Button
            label={fileText === null ? '저장한 파일 불러오기' : '다른 파일 불러오기'}
            variant="secondary"
            onPress={async () => loadFile(await pickChatFile())}
          />

          {fileText && parsed ? (
            <View style={styles.loaded}>
              <View style={styles.loadedHead}>
                <AppText variant="bodyBold">불러온 대화</AppText>
                <Chip label="지우기" onPress={discardFile} />
              </View>
              {parsed.speakers.length !== 2 ? (
                <AppText color={colors.warning}>
                  {parsed.speakers.length > 2
                    ? `대화에서 ${parsed.speakers.length}명을 찾았어요. 단톡방은 아직 지원하지 않아요. 1:1 대화방을 내보내 주세요.`
                    : '대화에서 두 사람을 찾지 못했어요. 카톡 · 라인 "대화 내보내기"로 만든 파일인지 확인해 주세요.'}
                </AppText>
              ) : (
                <>
                  <AppText variant="caption">누가 나인가요?</AppText>
                  <View style={styles.chips}>
                    {parsed.speakers.map((s) => (
                      <Chip key={s} label={s} selected={me === s} onPress={() => setMe(s)} />
                    ))}
                  </View>
                  {sample ? (
                    <AppText style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
                      이름을 가린 최근 {sample.lines.length}줄(내 메시지 {sample.mine}개 · 상대{' '}
                      {sample.theirs}개)을 보내 말투를 요약해요. 사진 · 이모티콘 알림 · 링크는 빼요.
                    </AppText>
                  ) : null}
                  {sample && !enough ? (
                    <AppText variant="caption" color={colors.warning}>
                      고른 쪽의 메시지가 너무 적어요 ({STYLE_MIN_MINE}개 이상 필요). 더 긴 대화를
                      내보내 주세요.
                    </AppText>
                  ) : null}
                </>
              )}
              <Button
                label="말투 학습하기"
                icon={(c) => <SparkleIcon size={18} color={c} />}
                loading={busy}
                disabled={!enough || (!wantMe && !wantPartner)}
                onPress={analyze}
              />
            </View>
          ) : null}
        </Card>
      )}

      {error ? (
        <AppText style={{ fontSize: 14 }} color={colors.warning}>
          {error}
        </AppText>
      ) : null}
      {notice ? (
        <AppText style={{ fontSize: 14, fontFamily: fonts.bold }} color={colors.accent}>
          {notice}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tips: {
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: 12,
  },
  loaded: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  loadedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: MIN_TOUCH + 8,
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
});
