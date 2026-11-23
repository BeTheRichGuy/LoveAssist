import type { PracticeStyle } from '@loveassist/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

import { CharacterArt } from './character-art';
import { AppText } from './text';

// 스타일 선택 카드 2종 (온보딩 STEP 3, 설정 화면에서 같이 쓴다)

function ScorePreview() {
  return (
    <View style={[styles.preview, { backgroundColor: colors.bg, padding: 10, gap: 6 }]}>
      <View
        style={{
          alignSelf: 'flex-start',
          width: 52,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.border,
        }}
      />
      <View
        style={{
          alignSelf: 'flex-end',
          width: 44,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.accent,
        }}
      />
      <View style={{ flex: 1 }} />
      <AppText
        style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 28, alignSelf: 'flex-end' }}
      >
        52
      </AppText>
    </View>
  );
}

function StoryPreview() {
  return (
    <View
      style={[
        styles.preview,
        { backgroundColor: colors.story.scene, overflow: 'hidden', alignItems: 'center' },
      ]}
    >
      <View style={{ marginTop: 6 }}>
        <CharacterArt id="sunny" mood="happy" width={64} />
      </View>
      <View style={styles.previewDialog} />
    </View>
  );
}

export function StylePicker({
  value,
  onChange,
}: {
  value: PracticeStyle;
  onChange: (s: PracticeStyle) => void;
}) {
  const options = [
    {
      value: 'score' as const,
      title: '스코어 모드',
      body: '메신저처럼 대화하고, 점수와 스탯으로 바로 확인해요',
      preview: <ScorePreview />,
      accent: colors.accent,
      surface: colors.accentSurface,
    },
    {
      value: 'story' as const,
      title: '스토리 모드',
      body: '일러스트 캐릭터와 비주얼 노벨처럼 대화해요. 점수는 반응과 호감으로 보여줘요',
      preview: <StoryPreview />,
      accent: colors.story.accent,
      surface: colors.story.accentSurface,
      badge: 'NEW',
    },
  ];
  return (
    <View style={{ gap: 14 }}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              styles.card,
              selected && { borderWidth: 2, borderColor: o.accent, backgroundColor: o.surface },
              pressed && { opacity: 0.8 },
            ]}
          >
            {o.preview}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText style={{ fontFamily: fonts.bold, fontSize: 17 }}>{o.title}</AppText>
                {o.badge ? (
                  <View style={styles.badge}>
                    <AppText
                      style={{ fontFamily: fonts.bold, fontSize: 11 }}
                      color={colors.onAccent}
                    >
                      {o.badge}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText style={{ fontSize: 13, lineHeight: 20 }} color={colors.textSub}>
                {o.body}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  preview: { width: 96, height: 120, borderRadius: 12 },
  previewDialog: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(21,19,27,0.88)',
    borderWidth: 1,
    borderColor: colors.story.accent,
  },
  badge: {
    backgroundColor: colors.story.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
