import type { ChatLine, PartnerMood, ReplyScore } from '@loveassist/shared';
import { useEffect, useRef, useState } from 'react';

import { AFFINITY_START, affinityDelta, clampAffinity } from '@/lib/scoring';
import { describeAiError } from '@/lib/relay-client';
import { score as scoreReply, simulate } from '@/services/ai';
import { myStyleFor, partnerContext, useAppState } from '@/state/app-state';

export type PracticeMessage = {
  id: number;
  speaker: ChatLine['speaker'];
  text: string;
  mood?: PartnerMood;
  /** 내가 보낸 메시지의 점수 */
  score?: number;
};

/** LLM에 보내는 대화 길이 상한 (최소 정보 원칙) */
const HISTORY_LIMIT = 30;

const toLines = (msgs: PracticeMessage[]): ChatLine[] =>
  msgs.slice(-HISTORY_LIMIT).map(({ speaker, text }) => ({ speaker, text }));

/**
 * 시뮬레이션 대화 로직. 스코어 · 스토리 모드가 같이 쓴다.
 * 흐름: 상대가 먼저 말을 건다 → 입력 → 보내기(채점) → 그대로 보내기 / 고치기 / 제안으로 바꾸기 → 상대 응답
 * 상대(7단계) · 채점(8단계) 모두 실제 AI.
 * 대화 기록은 이 화면 메모리에만 있고, 화면을 나가면 사라진다 (저장하지 않음).
 */
export function usePractice() {
  const { state, dispatch } = useAppState();
  const ctx = partnerContext(state);
  const nextId = useRef(0);
  const [messages, setMessages] = useState<PracticeMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<{ draft: string; result: ReplyScore } | null>(null);
  const [typing, setTyping] = useState(false);
  /** 상대 답장을 받지 못했을 때의 안내. "다시 받기"로 같은 기록에 다시 요청한다 */
  const [replyError, setReplyError] = useState<string | null>(null);
  /** 채점하지 못했을 때의 안내. 보내기를 다시 누르면 다시 채점한다 */
  const [scoreError, setScoreError] = useState<string | null>(null);

  const affinity = state.practice.affinity ?? AFFINITY_START;
  const mine = messages.filter((m) => m.speaker === 'me' && m.score !== undefined);
  const sessionAvg = mine.length
    ? Math.round(mine.reduce((s, m) => s + m.score!, 0) / mine.length)
    : null;
  const lastPartner = [...messages].reverse().find((m) => m.speaker === 'partner');

  /** 지금까지의 기록을 보내 상대의 다음 메시지를 받는다 (기록이 비면 첫 마디) */
  async function partnerTurn(history: PracticeMessage[]) {
    setTyping(true);
    setReplyError(null);
    try {
      const reply = await simulate({ partner: ctx, history: toLines(history) });
      setMessages((m) => [
        ...m,
        { id: nextId.current++, speaker: 'partner', text: reply.message, mood: reply.mood },
      ]);
    } catch (e) {
      setReplyError(describeAiError(e));
    } finally {
      setTyping(false);
    }
  }

  // 화면을 열면 상대가 먼저 말을 건다 (개발 모드에서 두 번 실행돼도 한 번만)
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void partnerTurn([]);
    // 처음 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestScore() {
    const text = draft.trim();
    if (!text || scoring || typing) return;
    setScoring(true);
    setScoreError(null);
    try {
      const result = await scoreReply({
        partner: ctx,
        history: toLines(messages),
        draft: text,
        myStyle: myStyleFor(state),
      });
      setScore({ draft: text, result });
    } catch (e) {
      setScoreError(describeAiError(e));
    } finally {
      setScoring(false);
    }
  }

  async function send() {
    if (!score) return;
    const total = score.result.total;
    const next: PracticeMessage[] = [
      ...messages,
      { id: nextId.current++, speaker: 'me', text: score.draft, score: total },
    ];
    setMessages(next);
    setDraft('');
    setScore(null);
    dispatch({
      type: 'recordTurn',
      score: total,
      affinity: clampAffinity(affinity + affinityDelta(total)),
    });
    await partnerTurn(next);
  }

  return {
    partnerName: ctx.label,
    messages,
    draft,
    /** 입력을 고치면 채점 실패 안내는 지운다 */
    setDraft: (t: string) => {
      setDraft(t);
      setScoreError(null);
    },
    scoring,
    score,
    typing,
    replyError,
    scoreError,
    /** 상대 답장 다시 받기 */
    retryReply: () => partnerTurn(messages),
    affinity,
    turn: mine.length + 1,
    sessionAvg,
    lastPartner,
    requestScore,
    send,
    /** 시트를 닫고 입력 중이던 답장을 그대로 둔다 */
    edit: () => setScore(null),
    applySuggestion: (text: string) => {
      setDraft(text);
      setScore(null);
    },
  };
}
