import { randomUUID } from 'expo-crypto';
import { eq } from 'drizzle-orm';

import type { Db } from './client';
import { settings } from './schema';

// 키-값 설정 읽기 · 쓰기 (온보딩 답변, 점검 기록 등)

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row && row.deletedAt === null ? row.value : null;
}

/** JSON으로 저장한 설정을 스키마로 읽는다. 없거나 깨졌으면 null (기본값으로 시작) */
export async function getJsonSetting<T>(
  db: Db,
  key: string,
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
): Promise<T | null> {
  try {
    const raw = await getSetting(db, key);
    const parsed = raw ? schema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(settings)
    .values({ id: randomUUID(), key, value, createdAt: now, updatedAt: now, deletedAt: null })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now, deletedAt: null } });
}
