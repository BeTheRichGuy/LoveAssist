import type { ChatLine, PartnerContext, ReplyScore } from '@loveassist/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { describeAiError } from '@/lib/relay-client';
import { verdictLabel } from '@/lib/scoring';
import { score } from '@/services/ai';
import { colors, fonts, radius, scoreColor } from '@/theme/tokens';

import { StatGrid } from './score-sheets';
import { AppText } from './text';
import { Button, Card } from './ui';

/**
 * 감정소 결과에서 "내가 보내려던 답장"을 바로 채점한다. 연습 화면과 같은 채점기 · 기준이라 점수가 같다.
 * 쓴 답장은 화면에만 있고 저장하지 않는다.
 */
export function MyReplyCard({
  partner,
  history,
  myStyle,
  onCopy,
}: {
  partner: PartnerContext;
  history: ChatLine[];
  /** 승인된 내 말투 (대안 답장을 이 말투로) */
  myStyle?: string[];
  onCopy: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ draft: string; score: ReplyScore } | null>(null);

  async function run() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      setResult({ draft: text, score: await score({ partner, history, draft: text, myStyle }) });
    } catch (e) {
      setError(describeAiError(e));
    } finally {
      setBusy(false);
    }
  }

  const stale = result !== null && result.draft !== draft.trim();

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <AppText variant="bodyBold">내가 쓴 답장 채점</AppText>
        <AppText variant="caption">
          보내려던 답장을 적으면 대화 연습과 같은 기준으로 점수를 매겨요
        </AppText>
      </View>
      <TextInput
        value={draft}
        onChangeText={(t) => {
          setDraft(t.slice(0, 500));
          setError(null);
        }}
        placeholder="예: 그럼 주말에 같이 갈래?"
        placeholderTextColor={colors.muted}
        multiline
        style={styles.input}
        accessibilityLabel="내가 쓴 답장"
      />
      <Button
        label={result && !stale ? '다시 채점' : '채점하기'}
        variant="secondary"
        loading={busy}
        disabled={!draft.trim()}
        onPress={run}
      />
      {error ? (
        <AppText style={{ fontSize: 14 }} color={colors.warning}>
          {error}
        </AppText>
      ) : null}
      {result ? (
        <View style={[{ gap: 12 }, stale && { opacity: 0.45 }]}>
          <View style={styles.head}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" numberOfLines={2}>
                &quot;{result.draft}&quot;
              </AppText>
              <AppText variant="title" color={scoreColor(result.score.total)}>
                {verdictLabel(result.score.total)}
              </AppText>
            </View>
            <AppText style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 48 }}>
              {result.score.total}
            </AppText>
          </View>
          <StatGrid axes={result.score.axes} compact />
          <AppText style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
            {result.score.tip}
          </AppText>
          {result.score.suggestion ? (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="이 답장을 복사해요"
              onPress={() => onCopy(result.score.suggestion!.text)}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.75 }]}
            >
              <AppText style={{ fontSize: 14 }}>
                → &quot;{result.score.suggestion.text}&quot;
              </AppText>
              <AppText variant="caption" color={colors.accent}>
                이렇게 바꿔 보기 · 예상 {result.score.suggestion.expectedScore}점 · 누르면 복사
              </AppText>
            </Pressable>
          ) : null}
          {stale ? <AppText variant="caption">답장을 고쳤어요. 다시 채점해 주세요.</AppText> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    maxHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  suggestion: {
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
});
