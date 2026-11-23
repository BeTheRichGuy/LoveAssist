import * as Clipboard from 'expo-clipboard';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReplyOption, SignalCard } from '@/components/analysis';
import { CloseIcon, ShareIcon } from '@/components/icons';
import { MyReplyCard } from '@/components/my-reply-card';
import { ShareCardModal } from '@/components/share-card';
import { AppText } from '@/components/text';
import { Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { withWaGwa } from '@/lib/korean';
import { alive, myStyleFor, partnerContext, useAppState } from '@/state/app-state';
import { colors, radius } from '@/theme/tokens';

export default function AnalyzeResultScreen() {
  const { state, dispatch } = useAppState();
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** 이 화면에서 "기억하기"를 누른 성향 (눌러도 목록에 남겨 저장됐다고 보여 준다) */
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  // 채점용 대화 맥락은 이 화면에서만 쓴다. 떠나면 메모리에서 지운다
  useEffect(() => () => dispatch({ type: 'clearAnalysisContext' }), [dispatch]);

  const result = state.lastAnalysis;
  if (!result) return <Redirect href="/analyze" />;
  const partner = state.partner;
  const ctx = partnerContext(state);
  const history = state.analysisContext ?? [
    { speaker: 'partner' as const, text: result.focusMessage },
  ];
  // 연습과 같은 채점기 점수를 쓴다. 채점 중이면 null, 채점이 실패하면 판독 때 받은 예상 점수
  const scoreOf = (r: (typeof result.replies)[number]) => {
    const s = state.replyScores[r.text];
    return s === undefined ? null : (s ?? r.expectedScore);
  };
  const scored = result.replies.map((r) => ({ ...r, shown: scoreOf(r) }));
  const allScored = scored.every((r) => r.shown !== null);
  const best = allScored ? Math.max(...scored.map((r) => r.shown!)) : null;
  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setToast('답장을 복사했어요');
  };
  // 이미 기억한 성향은 다시 제안하지 않는다 (방금 저장한 것은 "저장됨"으로 남긴다)
  const known = new Set(partner ? alive(partner.traits).map((t) => t.text) : []);
  const newTraits = [...new Set(result.traitSuggestions)].filter(
    (t) => !known.has(t) || added.includes(t),
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        padded={false}
        footer={
          partner ? (
            <Button
              label={`${withWaGwa(partner.nickname)} 연습하기`}
              onPress={() => router.replace('/practice')}
            />
          ) : (
            <>
              <Button label="이 상대로 연습 시작하기" onPress={() => router.push('/nickname')} />
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                다음 단계에서 닉네임을 정하면 성향이 기억돼요
              </AppText>
            </>
          )
        }
      >
        <View style={styles.topBar}>
          <IconButton label="닫기" onPress={() => router.replace(partner ? '/home' : '/analyze')}>
            <CloseIcon size={22} />
          </IconButton>
          <AppText variant="title">감정 판독</AppText>
          <IconButton label="공유" onPress={() => setSharing(true)}>
            <ShareIcon size={20} />
          </IconButton>
        </View>

        <View style={styles.body}>
          <SignalCard result={result} />
          <View style={{ gap: 10 }}>
            <AppText style={{ fontSize: 14 }} variant="bodyBold">
              추천 답장 · 점수
            </AppText>
            {scored.map((r) => (
              <ReplyOption
                key={r.text}
                text={r.text}
                score={r.shown}
                highlighted={best !== null && r.shown === best}
                onPress={() => copy(r.text)}
              />
            ))}
            <AppText variant="caption">
              {allScored
                ? '답장을 누르면 복사돼요 · 점수는 대화 연습과 같은 기준이에요'
                : '점수 매기는 중… 답장을 누르면 복사돼요'}
            </AppText>
          </View>
          <MyReplyCard partner={ctx} history={history} myStyle={myStyleFor(state)} onCopy={copy} />
          {partner && newTraits.length > 0 ? (
            <Card style={{ gap: 10 }}>
              <View style={{ gap: 2 }}>
                <AppText variant="bodyBold">새로 발견한 성향</AppText>
                <AppText variant="caption">
                  {partner.nickname}에 대해 기억할 것만 골라 주세요. 고른 것만 저장되고, 다시 누르면
                  취소돼요.
                </AppText>
              </View>
              {newTraits.map((t) => (
                <View key={t} style={styles.traitRow}>
                  <AppText style={{ flex: 1, fontSize: 14, lineHeight: 21 }}>{t}</AppText>
                  <Chip
                    label={added.includes(t) ? '저장됨' : '기억하기'}
                    selected={added.includes(t)}
                    onPress={() => {
                      if (added.includes(t)) {
                        // 저장 취소: 방금 저장한 성향을 지운다 (삭제 표시 + 내용 비움)
                        const saved = alive(partner.traits).find((x) => x.text === t);
                        if (saved) dispatch({ type: 'removeTrait', id: saved.id });
                        setAdded((a) => a.filter((x) => x !== t));
                      } else {
                        dispatch({ type: 'addTraits', traits: [t] });
                        setAdded((a) => [...a, t]);
                      }
                    }}
                  />
                </View>
              ))}
            </Card>
          ) : null}
        </View>

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <AppText style={{ fontSize: 14 }} color={colors.onAccent}>
              {toast}
            </AppText>
          </View>
        ) : null}
      </Screen>
      <ShareCardModal
        visible={sharing}
        onClose={() => setSharing(false)}
        result={{
          ...result,
          replies: scored.map((r) => ({ text: r.text, expectedScore: r.shown ?? r.expectedScore })),
        }}
        nickname={partner?.nickname ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  body: { paddingHorizontal: 20, gap: 16 },
  traitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toast: {
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
});
