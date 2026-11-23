import { describe, expect, it } from 'vitest';

import { consumeQuota, dailyLimit, kstDay } from '../src/quota';

describe('하루 사용량', () => {
  it('한도까지 쓰고 그다음은 막는다', () => {
    let state = null as ReturnType<typeof consumeQuota>['next'] | null;
    const results = [];
    for (let i = 0; i < 4; i++) {
      const r = consumeQuota(state, '2026-10-14', 'analyze', 3);
      state = r.next;
      results.push(r.ok);
    }
    expect(results).toEqual([true, true, true, false]);
    expect(state?.counts.analyze).toBe(3);
  });

  it('기능마다 따로 센다', () => {
    const a = consumeQuota(null, '2026-10-14', 'analyze', 1);
    const b = consumeQuota(a.next, '2026-10-14', 'score', 1);
    expect(b.ok).toBe(true);
    expect(b.next.counts).toEqual({ analyze: 1, score: 1 });
  });

  it('날짜가 바뀌면 다시 센다', () => {
    const full = consumeQuota(null, '2026-10-14', 'analyze', 1).next;
    expect(consumeQuota(full, '2026-10-14', 'analyze', 1).ok).toBe(false);
    expect(consumeQuota(full, '2026-10-15', 'analyze', 1)).toMatchObject({ ok: true, used: 1 });
  });

  it('하루는 한국 시간 자정에 바뀐다', () => {
    expect(kstDay(Date.parse('2026-10-14T14:59:00Z'))).toBe('2026-10-14'); // 23:59 KST
    expect(kstDay(Date.parse('2026-10-14T15:00:00Z'))).toBe('2026-10-15'); // 00:00 KST
  });

  it('한도는 설정값이 있으면 그 값, 없거나 이상하면 기본값', () => {
    expect(dailyLimit({ DAILY_LIMIT_ANALYZE: '7' }, 'analyze')).toBe(7);
    expect(dailyLimit({ DAILY_LIMIT_ANALYZE: 'abc' }, 'analyze')).toBe(20);
    expect(dailyLimit({}, 'score')).toBe(200);
  });
});
