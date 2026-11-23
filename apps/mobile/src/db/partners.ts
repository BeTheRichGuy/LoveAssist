import { and, desc, eq, isNull } from 'drizzle-orm';

import type { Partner } from '@/state/app-state';

import type { Db } from './client';
import { memos, partners, traits } from './schema';

// 상대 프로필(닉네임 · 승인한 성향 · 메모)을 암호화 DB에 읽고 쓴다.
// 지운 기록은 행을 남기되(soft delete) 내용은 빈 문자열로 덮어쓴다. DB는 secure_delete가 켜져 있어
// 덮어쓴 이전 내용도 파일에 남지 않는다 (client.ts).

// 읽기는 db.select()로 한다. 관계형 쿼리(db.query.*)도 폰(expo-sqlite)에서는 되지만,
// PC 검증용 드라이버(sql-js)에서는 칸 이름이 created_at 그대로 돌아와 같은 코드를 PC에서 검증할 수 없다.
const traitCols = {
  id: traits.id,
  createdAt: traits.createdAt,
  updatedAt: traits.updatedAt,
  deletedAt: traits.deletedAt,
  text: traits.text,
  kind: traits.kind,
};
const memoCols = {
  id: memos.id,
  createdAt: memos.createdAt,
  updatedAt: memos.updatedAt,
  deletedAt: memos.deletedAt,
  kind: memos.kind,
  text: memos.text,
};

/** 살아 있는 상대 중 가장 최근 것 하나와 그 성향 · 메모 (삭제 표시된 것은 빼고) */
export async function loadPartner(db: Db): Promise<Partner | null> {
  const [row] = await db
    .select()
    .from(partners)
    .where(isNull(partners.deletedAt))
    .orderBy(desc(partners.createdAt))
    .limit(1);
  if (!row) return null;
  const traitRows = await db
    .select(traitCols)
    .from(traits)
    .where(and(eq(traits.partnerId, row.id), isNull(traits.deletedAt)))
    .orderBy(traits.createdAt);
  const memoRows = await db
    .select(memoCols)
    .from(memos)
    .where(and(eq(memos.partnerId, row.id), isNull(memos.deletedAt)))
    .orderBy(memos.createdAt);
  return { ...row, deletedAt: null, traits: traitRows, memos: memoRows };
}

/** 지운 기록은 내용을 비운다 */
const erased = <T extends { deletedAt: string | null; text: string }>(r: T): T =>
  r.deletedAt === null ? r : { ...r, text: '' };

/** 프로필 전체를 그대로 저장한다 (있으면 고치고 없으면 넣는다). 상대 정보는 몇 줄뿐이라 통째로 쓴다 */
export async function savePartner(db: Db, p: Partner): Promise<void> {
  const row = {
    id: p.id,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt,
    nickname: p.deletedAt === null ? p.nickname : '',
    stage: p.stage,
  };
  await db.insert(partners).values(row).onConflictDoUpdate({ target: partners.id, set: row });
  for (const t of p.traits.map(erased)) {
    const values = { ...t, partnerId: p.id };
    await db.insert(traits).values(values).onConflictDoUpdate({ target: traits.id, set: values });
  }
  for (const m of p.memos.map(erased)) {
    const values = { ...m, partnerId: p.id };
    await db.insert(memos).values(values).onConflictDoUpdate({ target: memos.id, set: values });
  }
}

/** 정리하기: 프로필과 딸린 성향 · 메모를 모두 삭제 표시하고 내용을 비운다 */
export async function erasePartner(db: Db, p: Partner): Promise<void> {
  const now = new Date().toISOString();
  const gone = <T extends { deletedAt: string | null }>(r: T) =>
    r.deletedAt === null ? { ...r, deletedAt: now, updatedAt: now } : r;
  await savePartner(db, {
    ...gone(p),
    traits: p.traits.map(gone),
    memos: p.memos.map(gone),
  });
}
