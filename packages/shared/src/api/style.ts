import { z } from 'zod';
import { ChatLine, MyStyle } from '../domain';

// 내 말투 학습: 카톡 대화 내보내기 파일에서 뽑은 표본(이름을 가린 최근 줄)으로
// "나"의 말투 요약과 상대 성향 후보를 받는다. 둘 다 사용자가 승인한 것만 저장된다.
// 원문 파일은 기기에서 읽은 직후 지운다.

export const StyleRequest = z.object({
  /** 이름을 "나" · 닉네임으로 바꾼 최근 줄. 앱이 소음(사진 · 이모티콘 알림 등)을 빼고 줄당 200자로 자른다 */
  lines: z.array(ChatLine).min(5).max(150),
  /** 상대 호칭 (닉네임, 없으면 "상대") */
  partnerLabel: z.string().min(1).max(20),
});
export type StyleRequest = z.infer<typeof StyleRequest>;

export const StyleResult = z.object({
  /**
   * "나"의 말투 특징 최대 5개 (말투만, 대화 내용 · 사실은 담지 않음).
   * 서버가 민감정보를 걸러 내면 비어 올 수 있다 (min을 두면 앱이 정상 응답을 오류로 본다)
   */
  myStyle: MyStyle.max(5),
  /**
   * 코치 한마디 0~2개: 학습한 내 말투 중 상대에게 안 좋게 보일 수 있는 습관과 고치는 법. 저장하지 않고 화면에만 보여 준다.
   * 예전 서버 응답에는 없을 수 있다
   */
  myStyleTips: z.array(z.string().max(100)).max(2).optional(),
  /** 상대 소통 성향 후보 0~3개. 민감정보 금지 */
  partnerTraits: z.array(z.string().max(100)).max(3),
  /** 상대 말투 후보 0~4개 (말투만, 대화 내용 · 사실은 담지 않음) */
  partnerSpeech: z.array(z.string().max(100)).max(4),
});
export type StyleResult = z.infer<typeof StyleResult>;
