import { z } from 'zod';

/** 관계 단계. 온보딩에서 고르고, 상대 프로필의 기본값이 된다. */
export const RelationshipStage = z.enum(['some', 'dating', 'slump', 'breakup']);
export type RelationshipStage = z.infer<typeof RelationshipStage>;

/** 온보딩 "갈등이 있나요?" 답변. none이 아니면 감정소가 갈등 해결 모드로 시작한다. */
export const ConflictLevel = z.enum(['none', 'some', 'serious']);
export type ConflictLevel = z.infer<typeof ConflictLevel>;

/** 연습 화면 스타일. 채점·조언 엔진은 같고 보여주는 방식만 다르다. */
export const PracticeStyle = z.enum(['score', 'story']);
export type PracticeStyle = z.infer<typeof PracticeStyle>;

/** 모든 저장 레코드의 공통 필드 (설계 원칙). */
export const BaseRecord = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type BaseRecord = z.infer<typeof BaseRecord>;

/** 0~100 점수 */
export const Score = z.number().int().min(0).max(100);

/**
 * LLM으로 보내는 대화 한 줄. 실명은 앱에서 "나"와 상대 닉네임(없으면 "상대")으로 치환한 뒤에만 담는다.
 * 시각·날짜 같은 부가 정보는 보내지 않는다 (최소 정보 원칙).
 */
export const ChatLine = z.object({
  speaker: z.enum(['me', 'partner']),
  text: z.string().min(1).max(1000),
});
export type ChatLine = z.infer<typeof ChatLine>;

/**
 * 사용자("나")의 평소 말투 요약. 대화 파일에서 AI가 제안하고 사용자가 승인한 것만 담는다.
 * 감정소 추천 답장 · 채점 대안을 이 말투로 쓰게 한다. 예: "반말, 한 줄씩 짧게 끊어 보냄"
 */
export const MyStyle = z.array(z.string().min(1).max(80)).max(6);
export type MyStyle = z.infer<typeof MyStyle>;

/** LLM에 넘기는 상대 정보. 승인된 성향과 사용자가 쓴 메모만 담는다. */
export const PartnerContext = z.object({
  /** 닉네임. 아직 없으면 "상대" */
  label: z.string().min(1).max(20),
  stage: RelationshipStage,
  traits: z.array(z.string().max(100)).max(20),
  /** 상대 말투 (대화 파일에서 학습해 승인한 것). 시뮬레이션 상대가 이 말투로 말한다 */
  speech: z.array(z.string().max(100)).max(8).optional(),
  memos: z.array(z.string().max(200)).max(20),
});
export type PartnerContext = z.infer<typeof PartnerContext>;
