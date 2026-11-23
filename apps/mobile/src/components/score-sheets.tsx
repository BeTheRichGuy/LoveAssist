import type { ReplyScore } from '@loveassist/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { affinityDelta, AXIS_LABELS, storyReaction, verdictLabel } from '@/lib/scoring';
import { colors, fonts, radius, scoreColor } from '@/theme/tokens';

import { HeartFilledIcon } from './icons';
import { AppText } from './text';
import { Button } from './ui';

// 같은 채점 결과를 두 가지 스킨으로 보여준다 (시안 C · C+).

type SheetProps = {
  draft: string;
  score: ReplyScore;
  partnerName: string;
  onSend: () => void;
  onEdit: () => void;
  onApplySuggestion: (text: string) => void;
};

export function StatGrid({ axes, compact }: { axes: ReplyScore['axes']; compact?: boolean }) {
  return (
    <View style={styles.statGrid}>
      {AXIS_LABELS.map(({ key, label }) => (
        <View key={key} style={[styles.stat, compact && { paddingVertical: 8 }]}>
          <AppText
            style={{ fontFamily: fonts.bold, fontSize: compact ? 16 : 18 }}
            color={scoreColor(axes[key])}
          >
            {axes[key]}
          </AppText>
          <AppText style={{ fontSize: 11 }} color={colors.textSub}>
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** 스코어 모드: 입력창 자리에 올라오는 채점 시트 */
export function ScoreSheet({ draft, score, onSend, onEdit, onApplySuggestion }: SheetProps) {
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHead}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="caption" numberOfLines={2}>
            &quot;{draft}&quot;
          </AppText>
          <AppText variant="title" style={{ fontSize: 22 }} color={scoreColor(score.total)}>
            {verdictLabel(score.total)}
          </AppText>
        </View>
        <AppText style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 60 }}>
          {score.total}
        </AppText>
      </View>
      <StatGrid axes={score.axes} />
      <View style={styles.tipBox}>
        <AppText style={{ fontFamily: fonts.bold, fontSize: 13 }} color={colors.accent}>
          개선 포인트
        </AppText>
        <AppText style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
          {score.tip}
        </AppText>
        {score.suggestion ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="입력창의 답장을 이 문장으로 바꿔요"
            onPress={() => onApplySuggestion(score.suggestion!.text)}
            style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.75 }]}
          >
            <AppText style={{ fontSize: 14 }}>→ &quot;{score.suggestion.text}&quot;</AppText>
            <AppText variant="caption" color={colors.accent}>
              이 답장으로 바꾸기 · 예상 {score.suggestion.expectedScore}점
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button label="그대로 보내기" variant="secondary" onPress={onSend} style={styles.action} />
        <Button label="고치기" onPress={onEdit} style={styles.action} />
      </View>
    </View>
  );
}

/** 스토리 모드: 점수를 캐릭터 반응과 호감 변화로 번역한 카드 */
export function StoryScoreCard({
  score,
  partnerName,
  onSend,
  onEdit,
  onApplySuggestion,
}: SheetProps) {
  const delta = affinityDelta(score.total);
  const low = score.total < 55;
  return (
    <View style={styles.storyCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={[styles.ring, { borderColor: low ? colors.warning : colors.story.accent }]}>
          <AppText style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30 }}>
            {score.total}
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title" color={low ? colors.warning : colors.story.accent}>
            {storyReaction(score.total, partnerName)}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HeartFilledIcon size={14} />
            <AppText style={{ fontSize: 13 }} color={colors.textSoft}>
              예상 호감 변화 {delta > 0 ? `+${delta}` : delta === 0 ? '±0' : `−${Math.abs(delta)}`}
            </AppText>
          </View>
        </View>
      </View>
      <StatGrid axes={score.axes} compact />
      <AppText style={{ fontSize: 14, lineHeight: 22 }} color={colors.textSoft}>
        {score.tip}
      </AppText>
      {score.suggestion ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="입력창의 대답을 이 문장으로 바꿔요"
          onPress={() => onApplySuggestion(score.suggestion!.text)}
          style={({ pressed }) => [styles.storySuggestion, pressed && { opacity: 0.75 }]}
        >
          <AppText variant="story" style={{ fontSize: 16, lineHeight: 24 }}>
            &quot;{score.suggestion.text}&quot;
          </AppText>
          <AppText variant="caption" color={colors.story.accent}>
            이 대답으로 바꾸기 · 예상 {score.suggestion.expectedScore}점
          </AppText>
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        <Button label="그대로 보내기" variant="secondary" onPress={onSend} style={styles.action} />
        <Button label="직접 고치기" onPress={onEdit} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.sheet,
    borderTopWidth: 1,
    borderColor: colors.divider,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 14,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  statGrid: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  tipBox: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 6 },
  suggestion: { gap: 2, paddingTop: 4, minHeight: 44, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, minHeight: 52 },
  storyCard: {
    backgroundColor: colors.sheet,
    borderWidth: 1,
    borderColor: colors.story.accent,
    borderRadius: radius.xl,
    padding: 20,
    gap: 14,
  },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storySuggestion: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.story.accent,
    backgroundColor: colors.story.accentSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
});
