import type { RunRecord } from './lib';
import type { ModelName } from './models';

// 비교 결과 정리: 원가 표, 블라인드 라벨 배정, 평가 집계.

const KRW_PER_USD = 1400;

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function costTable(runs: RunRecord[]): string {
  const rows = [
    '| 기능 | 모델 | 호출 | 실패 | 평균 입력 토큰 | 평균 출력 토큰 | 1회 원가 | 1,000회 원가 | 평균 응답 시간 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const groups = new Map<string, RunRecord[]>();
  for (const r of runs) {
    const k = `${r.feature}\t${r.model}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const [k, rs] of groups) {
    const [feature, model] = k.split('\t');
    const billed = rs.filter((r) => r.usage);
    const cost = mean(billed.map((r) => r.costUsd!));
    rows.push(
      `| ${[
        feature,
        model,
        rs.length,
        rs.filter((r) => !r.ok).length,
        Math.round(mean(billed.map((r) => r.usage!.inputTokens))),
        Math.round(mean(billed.map((r) => r.usage!.outputTokens))),
        `$${cost.toFixed(5)} (${(cost * KRW_PER_USD).toFixed(1)}원)`,
        `$${(cost * 1000).toFixed(2)} (${Math.round(cost * 1000 * KRW_PER_USD).toLocaleString()}원)`,
        `${(mean(rs.map((r) => r.latencyMs)) / 1000).toFixed(1)}초`,
      ].join(' | ')} |`,
    );
  }
  return `${rows.join('\n')}\n\n환율 ${KRW_PER_USD.toLocaleString()}원/USD 가정. 실패한 호출도 토큰이 쓰였으면 원가에 포함.\n`;
}

export const LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

/** 항목마다 모델 순서를 섞어 A/B/C 라벨을 붙인다. 정답지(key)는 평가가 끝날 때까지 열지 않는다. */
export function assignLabels(
  keys: string[],
  models: ModelName[],
  random: () => number = Math.random,
): Record<string, Record<string, ModelName>> {
  const out: Record<string, Record<string, ModelName>> = {};
  for (const key of keys) {
    const order = [...models];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    out[key] = Object.fromEntries(order.map((m, i) => [LABELS[i]!, m]));
  }
  return out;
}

export interface Votes {
  evaluator: string;
  runId: string;
  /** 항목 key → 고른 라벨. "same"은 차이 없음 */
  picks: Record<string, string>;
}

/** 기능별로 모델이 몇 번 1등으로 뽑혔는지 센다 */
export function tally(
  key: Record<string, Record<string, ModelName>>,
  votes: Votes[],
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const v of votes) {
    for (const [item, label] of Object.entries(v.picks)) {
      const feature = item.split('/')[1]!;
      const winner = label === 'same' ? '차이 없음' : key[item]?.[label];
      if (!winner) continue;
      out[feature] ??= {};
      out[feature][winner] = (out[feature][winner] ?? 0) + 1;
    }
  }
  return out;
}
