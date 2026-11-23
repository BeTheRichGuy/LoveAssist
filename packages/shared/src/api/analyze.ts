import { z } from 'zod';
import { ChatLine, MyStyle, PartnerContext, Score } from '../domain';

// 답장 감정소: 붙여넣은 대화 → 상대 기분 · 의미 해석 · 상황별 답장 추천 · 성향 제안

export const AnalyzeRequest = z.object({
  lines: z.array(ChatLine).min(1).max(100),
  partner: PartnerContext,
  /** 온보딩에서 갈등이 있다고 답했으면 conflict */
  mode: z.enum(['normal', 'conflict']),
  /** 승인된 내 말투. 없으면 대화 속 "나"의 말투를 따른다 */
  myStyle: MyStyle.optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export const SignalLevel = z.enum(['low', 'mid', 'high']);
export type SignalLevel = z.infer<typeof SignalLevel>;

export const AnalyzeResult = z.object({
  /** 판독 대상이 된 상대 메시지 (치환된 텍스트) */
  focusMessage: z.string(),
  /** 상대 기분 지표. 예: 대화 의지 · 피로감 · 서운함 */
  signals: z
    .array(
      z.object({
        label: z.string().max(10),
        level: SignalLevel,
        /** 막대 길이용 0~1 */
        value: z.number().min(0).max(1),
      }),
    )
    .min(1)
    .max(4),
  /** 의미 해석 + 어떻게 답하면 좋을지 한두 문장 */
  interpretation: z.string(),
  replies: z.array(z.object({ text: z.string(), expectedScore: Score })).length(3),
  /** 프로필에 저장할 성향 후보. 사용자가 승인한 것만 저장된다. 민감정보 금지 */
  traitSuggestions: z.array(z.string().max(100)).max(3),
});
export type AnalyzeResult = z.infer<typeof AnalyzeResult>;
