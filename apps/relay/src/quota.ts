// 설치별 하루 사용량 한도. 순수 함수라 vitest로 테스트하고, 저장은 usage-counter.ts(Durable Object)가 한다.
// 저장하는 것: 날짜 · 기능 이름 · 횟수뿐. 대화 내용 · 상대 정보는 없다.

export type QuotaState = { day: string; counts: Record<string, number> };

/** 하루는 한국 시간 자정에 바뀐다 */
export function kstDay(now = Date.now()): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 한 번 쓴다. 한도를 넘으면 ok: false (횟수는 늘리지 않는다) */
export function consumeQuota(
  state: QuotaState | null | undefined,
  day: string,
  feature: string,
  limit: number,
): { ok: boolean; used: number; next: QuotaState } {
  const counts = state?.day === day ? state.counts : {};
  const used = counts[feature] ?? 0;
  if (used >= limit) return { ok: false, used, next: { day, counts } };
  return { ok: true, used: used + 1, next: { day, counts: { ...counts, [feature]: used + 1 } } };
}

/**
 * 기능별 기본 한도. wrangler.jsonc의 vars `DAILY_LIMIT_<기능>`으로 바꿀 수 있다 (예: DAILY_LIMIT_ANALYZE).
 * 연습 1턴 = 채점 1 + 상대 답장 1. 기본값 기준 하루 최대 원가 약 400원 (감정소 14원 · 연습 1턴 0.6원)
 */
export const DEFAULT_DAILY_LIMITS: Record<string, number> = {
  analyze: 20,
  simulate: 200,
  score: 200,
  style: 5,
};

export function dailyLimit(vars: object, feature: string): number {
  const raw = (vars as Record<string, unknown>)[`DAILY_LIMIT_${feature.toUpperCase()}`];
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : (DEFAULT_DAILY_LIMITS[feature] ?? 50);
}
