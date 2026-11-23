import type { PartnerMood } from '@loveassist/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { usePractice } from '@/hooks/use-practice';
import { characterFor, useAppState } from '@/state/app-state';
import { colors, fonts, radius } from '@/theme/tokens';

import { CharacterArt } from './character-art';
import { CHARACTER_IMAGES } from './character-images';
import { BackIcon, HeartFilledIcon, MenuIcon } from './icons';
import { PracticeError, PracticeInput } from './practice-input';
import { StoryScoreCard } from './score-sheets';
import { AppText } from './text';
import { Button, IconButton, Overlay } from './ui';

type Practice = ReturnType<typeof usePractice>;

const MOOD_LABEL: Record<PartnerMood, string> = {
  happy: '웃음',
  neutral: '기본',
  shy: '수줍음',
  sad: '서운함',
  annoyed: '언짢음',
  surprised: '놀람',
};

// 스토리 모드 (C+안): 배경 위 캐릭터 + 비주얼 노벨식 대사창, 점수는 호감 게이지로.
// 캐릭터는 상대 성향으로 추천한 오리지널 캐릭터(설정에서 바꿀 수 있음), 표정은 상대 답장의 mood를 따른다.
export function StoryModePractice({ p }: { p: Practice }) {
  const [logOpen, setLogOpen] = useState(false);
  const mood = p.lastPartner?.mood ?? 'neutral';
  const character = characterFor(useAppState().state);
  const sceneImage = CHARACTER_IMAGES[character]?.[mood];

  return (
    <View style={{ flex: 1, backgroundColor: colors.story.base }}>
      {/* 생성한 일러스트(배경 포함)가 있으면 화면 전체 장면으로, 없으면 단색 장면 위에 SVG 시안 */}
      {sceneImage !== undefined ? (
        <Image
          source={sceneImage}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top"
          transition={150}
          accessibilityLabel={`${p.partnerName} · ${MOOD_LABEL[mood]}`}
        />
      ) : (
        <View style={styles.scene} />
      )}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.topBar}>
            <IconButton label="뒤로" onPress={() => router.back()} style={styles.chromeButton}>
              <BackIcon size={20} />
            </IconButton>
            <View style={styles.affinity} accessibilityLabel={`호감 ${p.affinity}`}>
              <HeartFilledIcon size={16} />
              <View style={styles.affinityTrack}>
                <View style={[styles.affinityFill, { width: `${p.affinity}%` }]} />
              </View>
              <AppText style={{ fontSize: 12 }}>호감 {p.affinity}</AppText>
            </View>
            <IconButton
              label="대화 기록"
              onPress={() => setLogOpen(true)}
              style={styles.chromeButton}
            >
              <MenuIcon size={20} />
            </IconButton>
          </View>

          <View style={styles.stage}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`캐릭터 바꾸기 · 지금 표정 ${MOOD_LABEL[mood]}`}
              onPress={() => router.push('/characters')}
              style={styles.character}
            >
              {sceneImage === undefined ? (
                <CharacterArt id={character} mood={mood} width={260} />
              ) : (
                <View style={{ width: 260, height: 320 }} />
              )}
            </Pressable>
            <View style={styles.aiBadge}>
              <AppText style={{ fontSize: 11 }} color={colors.textSoft}>
                AI 생성 캐릭터
              </AppText>
            </View>
          </View>

          <View style={styles.dialogWrap}>
            <View style={styles.nameplate}>
              <AppText style={{ fontFamily: fonts.display, fontSize: 16 }} color={colors.onAccent}>
                {p.partnerName}
              </AppText>
            </View>
            <View style={styles.dialog}>
              <AppText variant="story">{p.typing ? '…' : (p.lastPartner?.text ?? '')}</AppText>
            </View>
          </View>

          <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 8 }}>
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
            <PracticeInput
              value={p.draft}
              onChange={p.setDraft}
              onSubmit={p.requestScore}
              loading={p.scoring}
              disabled={p.typing}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {p.score ? (
        <View style={styles.overlay}>
          <SafeAreaView
            style={{ flex: 1, justifyContent: 'space-between' }}
            edges={['top', 'bottom']}
          >
            <View style={{ alignItems: 'center', gap: 6, paddingTop: 24, paddingHorizontal: 20 }}>
              <AppText variant="caption" color={colors.textSoft}>
                보내려는 대답
              </AppText>
              <AppText variant="story" style={{ fontSize: 18, textAlign: 'center' }}>
                &quot;{p.score.draft}&quot;
              </AppText>
            </View>
            <View style={{ padding: 12 }}>
              <StoryScoreCard
                draft={p.score.draft}
                score={p.score.result}
                partnerName={p.partnerName}
                onSend={p.send}
                onEdit={p.edit}
                onApplySuggestion={p.applySuggestion}
              />
            </View>
          </SafeAreaView>
        </View>
      ) : null}

      <Overlay visible={logOpen} background={colors.bg}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" style={{ padding: 20 }}>
            대화 기록
          </AppText>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
            {p.messages.map((m) => (
              <View key={m.id} style={{ gap: 2 }}>
                <AppText
                  variant="caption"
                  color={m.speaker === 'me' ? colors.accent : colors.story.accent}
                >
                  {m.speaker === 'me'
                    ? `나${m.score !== undefined ? ` · ${m.score}점` : ''}`
                    : p.partnerName}
                </AppText>
                <AppText variant="story" style={{ fontSize: 16 }}>
                  {m.text}
                </AppText>
              </View>
            ))}
          </ScrollView>
          <View style={{ padding: 20 }}>
            <Button label="닫기" variant="secondary" onPress={() => setLogOpen(false)} />
          </View>
        </View>
      </Overlay>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '62%',
    backgroundColor: colors.story.scene,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chromeButton: { borderRadius: 22, backgroundColor: colors.story.chrome },
  affinity: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.story.chrome,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  affinityTrack: {
    width: 80,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  affinityFill: { height: 6, borderRadius: 3, backgroundColor: colors.story.accent },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  character: { marginBottom: -24 },
  aiBadge: {
    position: 'absolute',
    top: 8,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.story.chrome,
  },
  dialogWrap: { paddingHorizontal: 12, marginBottom: 12, marginTop: -40 },
  nameplate: {
    alignSelf: 'flex-start',
    marginLeft: 14,
    height: 30,
    paddingHorizontal: 16,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: colors.story.accent,
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: colors.story.dialog,
    borderWidth: 1,
    borderColor: colors.story.accent,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 104,
  },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.story.dim },
});
