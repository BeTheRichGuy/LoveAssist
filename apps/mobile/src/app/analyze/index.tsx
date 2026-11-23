import type { ChatLine } from '@loveassist/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AnalyzingOverlay } from '@/components/analyzing-overlay';
import { CapturedChatEditor } from '@/components/captured-chat-editor';
import { CloseIcon, SettingsIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { anonymizeChat, parseChat, trimForSend } from '@/lib/chat-parse';
import { pickChatFile, PICK_ERRORS } from '@/lib/file-pick';
import { describeAiError } from '@/lib/relay-client';
import { analyze, score } from '@/services/ai';
import { CAPTURE_ERRORS, readCaptures } from '@/services/capture';
import { myStyleFor, partnerContext, useAppState } from '@/state/app-state';
import { colors, fonts, radius } from '@/theme/tokens';

const EXAMPLES = [
  {
    label: '예시: 피곤한 하루',
    text: [
      '[김다은] [오후 9:10] 도윤야 오늘 일 끝났어?',
      '[이도윤] [오후 9:11] 응 방금 끝났어!',
      '[김다은] [오후 9:12] 오늘 좀 피곤하네… 너는 뭐해?',
    ].join('\n'),
  },
  {
    label: '예시: 서운한 상황',
    text: [
      '[김다은] [오후 11:02] 오늘 하루 종일 연락이 없더라',
      '[이도윤] [오후 11:05] 아 미안 정신없었어',
      '[김다은] [오후 11:06] 그래… 좀 서운했어',
    ].join('\n'),
  },
  { label: '예시: 한 줄만', text: '주말에 뭐 해? 날씨 좋다던데' },
];

export default function AnalyzeInput() {
  const { state, dispatch } = useAppState();
  const [raw, setRaw] = useState('');
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 캡처에서 읽어 사용자가 고치는 중인 대화 (이름을 가린 상태). 있으면 붙여넣기 대신 이걸 보낸다 */
  const [captured, setCaptured] = useState<ChatLine[] | null>(null);
  const [capturing, setCapturing] = useState(false);

  const ctx = partnerContext(state);
  const conflictMode = state.onboarding.conflict !== null && state.onboarding.conflict !== 'none';
  const parsed = useMemo(() => parseChat(raw), [raw]);
  const groupChat = parsed.speakers.length > 2;
  const needsMe = parsed.speakers.length === 2 && me === null;
  // 미리보기에 보이는 내용이 곧 AI로 가는 내용이다 (최근 줄만, 긴 줄은 잘라서)
  const textMode = captured === null;
  const { lines, omitted } = useMemo(
    () =>
      trimForSend(
        captured
          ? captured.filter((l) => l.text.trim()).map((l) => ({ ...l, text: l.text.trim() }))
          : anonymizeChat(parsed, me, ctx.label),
      ),
    [captured, parsed, me, ctx.label],
  );

  async function loadCaptures() {
    setCapturing(true);
    setError(null);
    try {
      const res = await readCaptures(ctx.label);
      if (res.ok) {
        setCaptured(res.lines);
        setRaw('');
        setMe(null);
      } else if (CAPTURE_ERRORS[res.reason]) setError(CAPTURE_ERRORS[res.reason]);
    } finally {
      setCapturing(false);
    }
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const result = await analyze({
        lines,
        partner: ctx,
        mode: conflictMode ? 'conflict' : 'normal',
        myStyle: myStyleFor(state),
      });
      // 이름을 가린 최근 줄은 결과 화면의 답장 채점에만 쓰고, 화면을 떠나면 지운다
      dispatch({ type: 'setAnalysis', result, context: lines });
      // 추천 답장 점수를 연습과 같은 채점기로 다시 매긴다 (결과 화면을 보는 동안 채워진다)
      const history = lines.slice(-10);
      for (const r of result.replies) {
        score({ partner: ctx, history, draft: r.text, myStyle: myStyleFor(state) }).then(
          (s) => dispatch({ type: 'setReplyScore', text: r.text, total: s.total }),
          () => dispatch({ type: 'setReplyScore', text: r.text, total: null }),
        );
      }
      // 원문은 판독 직후 지운다 (설계 원칙)
      setRaw('');
      setMe(null);
      setCaptured(null);
      router.push('/analyze/result');
    } catch (e) {
      // 실패하면 원문은 화면에만 남겨 다시 시도할 수 있게 한다 (저장하지 않음)
      setError(describeAiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        footer={
          <>
            {error ? (
              <AppText style={{ textAlign: 'center', fontSize: 14 }} color={colors.warning}>
                {error}
              </AppText>
            ) : null}
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {loading
                ? 'AI가 읽는 중이에요 · 10초쯤 걸려요'
                : '이름은 가려서 보내요 · 원문은 판독 후 바로 지워져요'}
            </AppText>
            <Button
              label="감정 판독하기"
              loading={loading}
              disabled={lines.length === 0 || (textMode && (groupChat || needsMe)) || capturing}
              onPress={run}
            />
          </>
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 6 }}>
            <AppText variant="display" style={{ fontSize: 28, lineHeight: 36 }}>
              답장 감정소
            </AppText>
            <AppText color={colors.textSub}>
              받은 카톡을 붙여넣거나 캡처를 올리면 기분과 속뜻을 읽어 드려요.
            </AppText>
          </View>
          {state.partner ? (
            <IconButton label="닫기" onPress={() => router.replace('/home')}>
              <CloseIcon size={22} />
            </IconButton>
          ) : (
            <IconButton label="설정" onPress={() => router.push('/settings')}>
              <SettingsIcon size={22} color={colors.textSub} />
            </IconButton>
          )}
        </View>

        {conflictMode ? (
          <View style={styles.modeBadge}>
            <AppText style={{ fontFamily: fonts.bold, fontSize: 12 }} color={colors.warning}>
              갈등 해결 모드
            </AppText>
            <AppText variant="caption">
              온보딩에서 갈등이 있다고 답해서 화해에 초점을 맞춰요
            </AppText>
          </View>
        ) : null}

        {captured ? (
          <CapturedChatEditor
            lines={captured}
            partnerLabel={ctx.label}
            omitted={omitted}
            onChange={setCaptured}
            onCancel={() => setCaptured(null)}
          />
        ) : (
          <>
            <TextInput
              value={raw}
              onChangeText={(t) => {
                setRaw(t);
                setMe(null);
                setError(null);
              }}
              placeholder={
                '카톡 대화를 길게 눌러 복사한 뒤 붙여넣어 주세요.\n상대 메시지만 붙여넣어도 돼요.'
              }
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={styles.input}
            />
            <View style={styles.chips}>
              {EXAMPLES.map((e) => (
                <Chip
                  key={e.label}
                  label={e.label}
                  onPress={() => {
                    setRaw(e.text);
                    setMe(null);
                  }}
                />
              ))}
              <Chip
                label="대화 파일 불러오기"
                onPress={async () => {
                  const res = await pickChatFile();
                  if (res.ok) {
                    setRaw(res.text);
                    setMe(null);
                    setError(null);
                  } else if (PICK_ERRORS[res.reason]) setError(PICK_ERRORS[res.reason]);
                }}
              />
              <Chip
                label={capturing ? '캡처 읽는 중…' : '캡처 불러오기'}
                onPress={capturing ? undefined : loadCaptures}
              />
              {raw ? <Chip label="지우기" onPress={() => setRaw('')} /> : null}
            </View>

            {groupChat ? (
              <AppText color={colors.warning}>
                단톡방은 아직 지원하지 않아요. 1:1 대화만 붙여넣어 주세요.
              </AppText>
            ) : null}

            {parsed.speakers.length === 2 ? (
              <View style={{ gap: 10 }}>
                <AppText variant="bodyBold">누가 나인가요?</AppText>
                <View style={styles.chips}>
                  {parsed.speakers.map((s) => (
                    <Chip key={s} label={s} selected={me === s} onPress={() => setMe(s)} />
                  ))}
                </View>
              </View>
            ) : null}

            {raw.trim() && !groupChat && !needsMe ? (
              <Card style={{ gap: 10 }}>
                <AppText style={{ fontFamily: fonts.bold, fontSize: 13 }} color={colors.accent}>
                  AI로 보내는 내용
                </AppText>
                {omitted > 0 ? (
                  <AppText variant="caption">
                    대화가 길어서 앞부분 {omitted}줄은 빼고 최근 {lines.length}줄만 보내요
                  </AppText>
                ) : null}
                {lines.map((l, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                    <AppText
                      style={styles.speaker}
                      color={l.speaker === 'me' ? colors.accent : colors.textSub}
                    >
                      {l.speaker === 'me' ? '나' : ctx.label}
                    </AppText>
                    <AppText style={{ flex: 1, fontSize: 14, lineHeight: 22 }}>{l.text}</AppText>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        )}
      </Screen>
      {/* 판독 대기 화면은 Screen 바깥에 둔다 (Overlay 규칙) */}
      <AnalyzingOverlay visible={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  modeBadge: {
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  input: {
    minHeight: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: 16,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speaker: { width: 44, fontFamily: fonts.bold, fontSize: 13, lineHeight: 22 },
});
