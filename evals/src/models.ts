import type { Usage } from '@loveassist/relay/llm';

// 비교 대상 모델과 단가(USD / 100만 토큰, 2026-10 기준 Anthropic 공식 단가).
// 생각(thinking) 토큰도 출력 토큰으로 청구되어 usage.outputTokens에 포함된다.
// haiku-nothink: 같은 Haiku에서 생각을 끈 것. 채점 대기 시간 · 원가를 줄일 수 있는지 본다.
export const MODELS = {
  haiku: { id: 'claude-haiku-5-5', input: 0.1, output: 0.5, noThinking: false },
  'haiku-nothink': { id: 'claude-haiku-5-5', input: 0.1, output: 0.5, noThinking: true },
  sonnet: { id: 'claude-sonnet-5-5', input: 2, output: 10, noThinking: false },
  opus: { id: 'claude-opus-5-5', input: 4, output: 20, noThinking: false },
} as const;

export type ModelName = keyof typeof MODELS;

export function costUsd(model: ModelName, u: Usage): number {
  const p = MODELS[model];
  return (u.inputTokens * p.input + u.outputTokens * p.output) / 1_000_000;
}
