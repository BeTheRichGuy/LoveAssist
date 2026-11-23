import type { ChatLine } from '@loveassist/shared';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, MIN_TOUCH, radius } from '@/theme/tokens';

import { CloseIcon } from './icons';
import { AppText } from './text';
import { Button, Card, IconButton } from './ui';

/**
 * 캡처에서 읽은 대화를 보내기 전에 고친다 (설계 결정 6: 사용자 확인 · 수정 후 텍스트만 전송).
 * 화자를 눌러 나 ↔ 상대를 바꾸고, 글자를 고치고, 필요 없는 줄은 지운다. 여기 보이는 내용이 AI로 가는 내용이다.
 */
export function CapturedChatEditor({
  lines,
  partnerLabel,
  omitted,
  onChange,
  onCancel,
}: {
  lines: ChatLine[];
  partnerLabel: string;
  /** 너무 길어 앞부분을 뺀 줄 수 */
  omitted: number;
  onChange: (lines: ChatLine[]) => void;
  onCancel: () => void;
}) {
  const update = (i: number, next: Partial<ChatLine>) =>
    onChange(lines.map((l, j) => (j === i ? { ...l, ...next } : l)));

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <AppText style={{ fontFamily: fonts.bold, fontSize: 13 }} color={colors.accent}>
          캡처에서 읽은 대화 · AI로 보내는 내용
        </AppText>
        <AppText variant="caption">
          글자를 잘못 읽었거나 화자가 틀리면 고쳐 주세요. 이름(특히 내 이름)이 보이면 지워 주세요.
          캡처 이미지는 기기 밖으로 보내지 않았어요.
        </AppText>
        {omitted > 0 ? (
          <AppText variant="caption">대화가 길어서 앞부분 {omitted}줄은 빼고 보내요</AppText>
        ) : null}
      </View>
      {lines.map((l, i) => (
        <View key={i} style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`화자 바꾸기: 지금 ${l.speaker === 'me' ? '나' : partnerLabel}`}
            onPress={() => update(i, { speaker: l.speaker === 'me' ? 'partner' : 'me' })}
            style={[styles.speaker, l.speaker === 'me' && styles.speakerMe]}
          >
            <AppText
              style={{ fontFamily: fonts.bold, fontSize: 12 }}
              color={l.speaker === 'me' ? colors.onAccent : colors.textSoft}
              numberOfLines={1}
            >
              {l.speaker === 'me' ? '나' : partnerLabel}
            </AppText>
          </Pressable>
          <TextInput
            value={l.text}
            onChangeText={(text) => update(i, { text: text.slice(0, 1000) })}
            multiline
            accessibilityLabel={`${i + 1}번째 줄`}
            style={styles.input}
          />
          <IconButton
            label={`${i + 1}번째 줄 지우기`}
            onPress={() => onChange(lines.filter((_, j) => j !== i))}
          >
            <CloseIcon size={16} color={colors.textSub} />
          </IconButton>
        </View>
      ))}
      <Button label="캡처 대신 직접 붙여넣기" variant="secondary" onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speaker: {
    width: 58,
    minHeight: MIN_TOUCH,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  speakerMe: { backgroundColor: colors.accent, borderColor: colors.accent },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
