import type { AnalyzeResult } from '@loveassist/shared';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { maskName } from '@/lib/mask-name';
import { shareViewAsImage } from '@/lib/share-image';
import { colors, fonts, radius } from '@/theme/tokens';

import { SignalCard } from './analysis';
import { AppText } from './text';
import { Button, Overlay } from './ui';

/** 공유 카드에서는 닉네임까지 "상대"로 가린다. AI가 추천 답장에 닉네임을 넣을 수도 있어 답장도 가린다 */
function maskForShare(result: AnalyzeResult, nickname: string | null): AnalyzeResult {
  if (!nickname) return result;
  const mask = (s: string) => maskName(s, nickname);
  return {
    ...result,
    focusMessage: mask(result.focusMessage),
    interpretation: mask(result.interpretation),
    replies: result.replies.map((r) => ({ ...r, text: mask(r.text) })),
  };
}

export function ShareCardModal({
  visible,
  onClose,
  result,
  nickname,
}: {
  visible: boolean;
  onClose: () => void;
  result: AnalyzeResult;
  nickname: string | null;
}) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const masked = maskForShare(result, nickname);
  const best = [...masked.replies].sort((a, b) => b.expectedScore - a.expectedScore)[0]!;

  async function share() {
    setBusy(true);
    try {
      setMessage(await shareViewAsImage(cardRef));
    } catch {
      setMessage('공유 이미지를 만들지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay visible={visible}>
      <View style={styles.backdrop}>
        {/* 카드가 화면보다 길면 스크롤한다. 버튼은 항상 아래에 보이게 스크롤 밖에 둔다 */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollBody}>
          <View ref={cardRef} collapsable={false} style={styles.card}>
            <AppText variant="label">연애 어시스턴트 · 감정 판독</AppText>
            <SignalCard result={masked} />
            <View style={styles.best}>
              <AppText variant="caption">추천 답장</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <AppText
                  style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 34 }}
                  color={colors.accent}
                >
                  {best.expectedScore}
                </AppText>
                <AppText style={{ flex: 1 }}>{best.text}</AppText>
              </View>
            </View>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              AI 분석 결과 · 이름은 가려져 있어요
            </AppText>
          </View>
        </ScrollView>
        {message ? (
          <AppText variant="caption" style={{ textAlign: 'center' }} color={colors.textSoft}>
            {message}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <Button label="닫기" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button label="이미지로 공유" onPress={share} loading={busy} style={{ flex: 1 }} />
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  /** 카드가 짧으면 가운데, 길면 위에서부터 스크롤 */
  scrollBody: { flexGrow: 1, justifyContent: 'center' },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  best: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 6 },
  actions: { flexDirection: 'row', gap: 10 },
});
