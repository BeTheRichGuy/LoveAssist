import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 로컬 암호화 DB 스키마 (SQLCipher). 모든 테이블은 공통 컬럼을 가진다 (설계 원칙):
// id(UUID) · created_at · updated_at · deleted_at(soft delete). 시각은 ISO 8601 문자열.
// 스키마를 바꾸면 apps/mobile에서 `npm run db:generate`로 마이그레이션을 만든다.
//
// 저장하지 않는 것: 붙여넣은 대화 원문, 감정소 결과 원문, 시뮬레이션 대화 기록 (3층 메모리 원칙)

const base = {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

/** 앱 설정 · 온보딩 답변 등 키-값 */
export const settings = sqliteTable('settings', {
  ...base,
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});

/** 상대 프로필. 실명은 저장하지 않고 닉네임만 */
export const partners = sqliteTable('partners', {
  ...base,
  nickname: text('nickname').notNull(),
  stage: text('stage', { enum: ['some', 'dating', 'slump', 'breakup'] }).notNull(),
});

/**
 * 3층 메모리의 "요약" 층: 사용자가 승인한 것만.
 * kind = trait(소통 성향, 예: "답장이 느린 편") | speech(말투, 예: "반말에 ㅎㅎ를 자주 씀")
 */
export const traits = sqliteTable(
  'traits',
  {
    ...base,
    partnerId: text('partner_id')
      .notNull()
      .references(() => partners.id),
    text: text('text').notNull(),
    kind: text('kind', { enum: ['trait', 'speech'] })
      .notNull()
      .default('trait'),
  },
  (t) => [index('traits_partner_idx').on(t.partnerId)],
);

/** 3층 메모리의 "메모" 층: 사용자가 직접 쓴 것 */
export const memos = sqliteTable(
  'memos',
  {
    ...base,
    partnerId: text('partner_id')
      .notNull()
      .references(() => partners.id),
    kind: text('kind', { enum: ['anniversary', 'likes', 'dislikes', 'free'] }).notNull(),
    text: text('text').notNull(),
  },
  (t) => [index('memos_partner_idx').on(t.partnerId)],
);
