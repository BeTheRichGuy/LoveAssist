import { describe, expect, it } from 'vitest';
import type { RunRecord } from './lib';
import { costUsd } from './models';
import { assignLabels, costTable, tally } from './report';

describe('costUsd', () => {
  it('입력 · 출력 토큰에 모델 단가를 곱한다', () => {
    // haiku: 입력 $0.1, 출력 $0.5 / 100만 토큰
    expect(costUsd('haiku', { inputTokens: 1_000_000, outputTokens: 2_000_000 })).toBeCloseTo(1.1);
  });
});

describe('assignLabels', () => {
  it('항목마다 모든 모델이 라벨 하나씩 받는다', () => {
    const key = assignLabels(['a', 'b'], ['haiku', 'sonnet', 'opus']);
    for (const labels of Object.values(key)) {
      expect(Object.keys(labels)).toEqual(['A', 'B', 'C']);
      expect(new Set(Object.values(labels)).size).toBe(3);
    }
  });
});

describe('tally', () => {
  it('고른 라벨을 모델로 바꿔 기능별로 센다', () => {
    const key = {
      's/analyze': { A: 'opus', B: 'haiku' },
      's/score/1': { A: 'haiku', B: 'opus' },
    } as const;
    const result = tally(key, [
      { evaluator: '1', runId: 'r', picks: { 's/analyze': 'A', 's/score/1': 'A' } },
      { evaluator: '2', runId: 'r', picks: { 's/analyze': 'same', 's/score/1': 'A' } },
    ]);
    expect(result).toEqual({ analyze: { opus: 1, '차이 없음': 1 }, score: { haiku: 2 } });
  });
});

describe('costTable', () => {
  it('실패한 호출 수와 1,000회 원가를 보여 준다', () => {
    const run = (ok: boolean): RunRecord => ({
      key: 'k',
      feature: 'score',
      model: 'haiku',
      ok,
      output: null,
      error: ok ? null : 'x',
      usage: { inputTokens: 1000, outputTokens: 200 },
      costUsd: 0.0002,
      latencyMs: 1500,
    });
    const table = costTable([run(true), run(false)]);
    expect(table).toContain(
      '| score | haiku | 2 | 1 | 1000 | 200 | $0.00020 (0.3원) | $0.20 (280원) | 1.5초 |',
    );
  });
});
