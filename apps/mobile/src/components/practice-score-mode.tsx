import { router } from 'expo-router';
import { useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { usePractice } from '@/hooks/use-practice';
import { withWaGwa } from '@/lib/korean';
import { colors, fonts, scoreColor } from '@/theme/tokens';

import { BackIcon } from './icons';
import { PracticeError, PracticeInput } from './practice-input';
import { ScoreSheet } from './score-sheets';
import { AppText } from './text';
import { IconButton } from './ui';

type Practice = ReturnType<typeof usePractice>;

// 스코어 모드 (C안): 메신저형 대화 + 보내기 시 채점 시트
export function ScoreModePractice({ p }: { p: Practice }) {
  const scrollRef = useRef<ScrollView>(null);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.header}>
          <IconButton label="뒤로" onPress={() => router.back()}>
            <BackIcon size={22} />
          </IconButton>
          <View style={styles.avatar}>
            <AppText style={{ fontFamily: fonts.display, fontSize: 18 }} color={colors.accent}>
              {p.partnerName.slice(0, 1)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyBold" style={{ fontSize: 16 }}>
              {withWaGwa(p.partnerName)} 연습
            </AppText>
            <AppText variant="caption">
              AI 캐릭터 · {p.turn}턴째{p.sessionAvg !== null ? ` · 평균 ${p.sessionAvg}점` : ''}
            </AppText>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {p.messages.map((m) =>
            m.speaker === 'partner' ? (
              <View key={m.id} style={[styles.bubble, styles.theirs]}>
                <AppText>{m.text}</AppText>
              </View>
            ) : (
              <View key={m.id} style={styles.mineWrap}>
                {m.score !== undefined ? (
                  <AppText
                    style={{ fontFamily: fonts.bold, fontSize: 12 }}
                    color={scoreColor(m.score)}
                  >
                    {m.score}
                  </AppText>
                ) : null}
                <View style={[styles.bubble, styles.mine]}>
                  <AppText color={colors.onAccent}>{m.text}</AppText>
                </View>
              </View>
            ),
          )}
          {p.typing ? (
            <View style={[styles.bubble, styles.theirs]}>
              <AppText color={colors.textSub}>입력 중…</AppText>
            </View>
          ) : null}
        </ScrollView>

        {p.score ? (
          <ScoreSheet
            draft={p.score.draft}
            score={p.score.result}
            partnerName={p.partnerName}
            onSend={p.send}
            onEdit={p.edit}
            onApplySuggestion={p.applySuggestion}
          />
        ) : (
          <View style={styles.inputArea}>
            {p.replyError ? (
              <PracticeError
                message={p.replyError}
                actionLabel="다시 받기"
                onAction={p.retryReply}
              />
            ) : null}
            {p.scoreError ? (
              <PracticeError
                message={`채점하지 못했어요. ${p.scoreError}`}
                actionLabel="다시 채점"
                onAction={p.requestScore}
              />
            ) : null}
            {p.turn === 1 ? (
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                보내기를 누르면 상대에게 가기 전에 먼저 채점해 드려요
              </AppText>
            ) : null}
            <PracticeInput
              value={p.draft}
              onChange={p.setDraft}
              onSubmit={p.requestScore}
              loading={p.scoring}
              disabled={p.typing}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: { padding: 20, gap: 10 },
  bubble: { maxWidth: 260, paddingHorizontal: 14, paddingVertical: 10 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  mineWrap: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  mine: {
    backgroundColor: colors.accent,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  inputArea: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 8 },
});
