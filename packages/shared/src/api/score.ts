import { z } from 'zod';
import { ChatLine, MyStyle, PartnerContext, Score } from '../domain';

// 답장 채점: 보내기 버튼을 누를 때 한 번 호출한다.
// 축과 기준은 프롬프트에 고정하고, 조종 · 밀당성 메시지는 고득점을 주지 않는다.

export const ScoreRequest = z.object({
  partner: PartnerContext,
  history: z.array(ChatLine).max(30),
  draft: z.string().min(1).max(500),
  /** 승인된 내 말투. 대안 답장(suggestion)을 이 말투로 쓴다 */
  myStyle: MyStyle.optional(),
});
export type ScoreRequest = z.infer<typeof ScoreRequest>;

export const ScoreAxes = z.object({
  /** 공감 */
  empathy: Score,
  /** 상대 성향 맞춤 */
  fit: Score,
  tone: Score,
  /** 템포: 길이 · 질문 여부 등 대화를 이어 가는 힘 */
  tempo: Score,
});
export type ScoreAxes = z.infer<typeof ScoreAxes>;

export const ReplyScore = z.object({
  total: Score,
  axes: ScoreAxes,
  /** 개선 포인트 한 줄 */
  tip: z.string(),
  /** 더 나은 대안. 점수가 충분히 높으면 null */
  suggestion: z.object({ text: z.string(), expectedScore: Score }).nullable(),
});
export type ReplyScore = z.infer<typeof ReplyScore>;
