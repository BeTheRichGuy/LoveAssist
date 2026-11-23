import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { SendIcon } from './icons';
import { AppText } from './text';
import { Chip } from './ui';

/** 대답 입력창 + 보내기(=채점 요청) 버튼 */
export function PracticeInput({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
  placeholder = '대답을 입력하세요',
}: {
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
  placeholder?: string;
}) {
  const canSend = value.trim().length > 0 && !disabled && !loading;
  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.slice(0, 500))}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        multiline
        accessibilityLabel="대답 입력"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="보내기 전 채점"
        disabled={!canSend}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.send,
          !canSend && { opacity: 0.4 },
          pressed && { opacity: 0.75 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <SendIcon size={22} color={colors.onAccent} />
        )}
      </Pressable>
    </View>
  );
}

/** 상대 답장 · 채점을 받지 못했을 때 안내 + 다시 시도 */
export function PracticeError({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.error}>
      <AppText style={{ flex: 1, fontSize: 13, lineHeight: 19 }} color={colors.warning}>
        {message}
      </AppText>
      <Chip label={actionLabel} onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#4A4560',
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 15,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
