import { z } from 'zod';
import { ChatLine, PartnerContext } from '../domain';

// 시뮬레이션: 프로필 기반 가상 상대의 다음 메시지.
// 서버는 무상태라 대화 기록은 앱이 들고 있다가 매 턴 필요한 만큼만 보낸다.

export const SimulateRequest = z.object({
  partner: PartnerContext,
  /** 비어 있으면 상대가 먼저 말을 거는 첫 메시지를 만든다 (연습 시작) */
  history: z.array(ChatLine).max(30),
});
export type SimulateRequest = z.infer<typeof SimulateRequest>;

/** 스토리 모드 캐릭터 표정 6종과 1:1로 맞춘다. */
export const PartnerMood = z.enum(['happy', 'neutral', 'shy', 'sad', 'annoyed', 'surprised']);
export type PartnerMood = z.infer<typeof PartnerMood>;

export const SimulateResponse = z.object({
  message: z.string(),
  mood: PartnerMood,
});
export type SimulateResponse = z.infer<typeof SimulateResponse>;
