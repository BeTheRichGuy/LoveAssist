import type { PartnerMood } from '@loveassist/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CharacterArt } from '@/components/character-art';
import { BackIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, Chip, IconButton, Screen } from '@/components/ui';
import { CHARACTER_IDS, CHARACTERS, recommendCharacter, type CharacterId } from '@/lib/characters';
import { characterFor, traitsOf, useAppState } from '@/state/app-state';
import { colors, fonts, radius } from '@/theme/tokens';

const MOODS: { mood: PartnerMood; label: string }[] = [
  { mood: 'neutral', label: '기본' },
  { mood: 'happy', label: '웃음' },
  { mood: 'shy', label: '수줍음' },
  { mood: 'sad', label: '서운함' },
  { mood: 'annoyed', label: '언짢음' },
  { mood: 'surprised', label: '놀람' },
];

// 스토리 모드 캐릭터 고르기. 상대 성향으로 추천하고, 사용자가 바꿀 수 있다.
// 정해 둔 오리지널 캐릭터만 고를 수 있다 (상대 사진 · 자유 입력으로 만들지 않음, 결정 10).
export default function CharactersScreen() {
  const { state, dispatch } = useAppState();
  const current = characterFor(state);
  const [viewing, setViewing] = useState<CharacterId>(current);
  const [mood, setMood] = useState<PartnerMood>('neutral');
  const traits = state.partner ? traitsOf(state.partner, 'trait').map((t) => t.text) : [];
  const recommended = new Set([recommendCharacter(traits, 'f'), recommendCharacter(traits, 'm')]);
  const c = CHARACTERS[viewing];

  return (
    <Screen
      scroll
      footer={
        <Button
          label={viewing === current ? '지금 쓰는 캐릭터예요' : `${c.label}으로 정하기`}
          disabled={viewing === current}
          onPress={() => dispatch({ type: 'setCharacter', character: viewing })}
        />
      }
    >
      <View style={styles.header}>
        <IconButton label="뒤로" onPress={() => router.back()} style={{ marginLeft: -12 }}>
          <BackIcon size={22} />
        </IconButton>
        <AppText variant="title">스토리 모드 캐릭터</AppText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.stage}>
        <View style={styles.aiBadge}>
          <AppText style={{ fontSize: 11 }} color={colors.textSoft}>
            AI 생성 캐릭터
          </AppText>
        </View>
        <CharacterArt id={viewing} mood={mood} width={220} />
      </View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <AppText variant="bodyBold">
          {c.label}
          {recommended.has(viewing) ? ' · 추천' : ''}
        </AppText>
        <AppText variant="caption">{c.blurb}</AppText>
      </View>

      <View style={styles.chips}>
        {MOODS.map((m) => (
          <Chip
            key={m.mood}
            label={m.label}
            selected={mood === m.mood}
            onPress={() => setMood(m.mood)}
          />
        ))}
      </View>

      {/* 표정 한눈에 보기 */}
      <View style={styles.moodRow}>
        {MOODS.map((m) => (
          <Pressable
            key={m.mood}
            accessibilityRole="button"
            accessibilityLabel={`${m.label} 표정 보기`}
            onPress={() => setMood(m.mood)}
            style={[styles.moodCell, mood === m.mood && styles.selected]}
          >
            <CharacterArt id={viewing} mood={m.mood} width={48} framing="face" />
          </Pressable>
        ))}
      </View>

      <AppText variant="bodyBold">성향별 캐릭터</AppText>
      <View style={styles.grid}>
        {CHARACTER_IDS.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${CHARACTERS[id].label} 보기`}
            onPress={() => setViewing(id)}
            style={[styles.cell, viewing === id && styles.selected]}
          >
            <CharacterArt id={id} width={64} framing="face" />
            <AppText style={{ fontFamily: fonts.bold, fontSize: 12 }}>
              {CHARACTERS[id].label}
            </AppText>
            <AppText
              style={{ fontSize: 10 }}
              color={id === current ? colors.accent : colors.textSoft}
            >
              {id === current ? '사용 중' : recommended.has(id) ? '추천' : ' '}
            </AppText>
          </Pressable>
        ))}
      </View>

      <AppText variant="caption">
        AI가 그린 오리지널 성인 캐릭터예요. 실제 인물이나 상대 사진과는 관계없어요. 추천은 저장된
        상대 성향으로 골라요.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stage: {
    alignItems: 'center',
    backgroundColor: colors.story.scene,
    borderRadius: radius.lg,
    paddingTop: 16,
    overflow: 'hidden',
  },
  aiBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.story.chrome,
    zIndex: 1,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodCell: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.story.scene,
    overflow: 'hidden',
    paddingTop: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  cell: {
    width: '23.5%',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    gap: 2,
  },
  selected: { borderColor: colors.accent, borderWidth: 2 },
});
