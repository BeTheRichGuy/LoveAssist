import Anthropic from '@anthropic-ai/sdk';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generate, type Usage } from '@loveassist/relay/llm';
import { FEATURES } from '@loveassist/relay/prompts';
import { costUsd, MODELS, type ModelName } from './models';
import { parseSample, tasksFor, type Sample, type Task } from './sample';

// 스크립트는 evals/ 폴더에서 실행된다 (npm run -w @loveassist/evals)
export const SAMPLES_DIR = 'samples';
export const RESULTS_DIR = 'results';

export interface RunRecord {
  key: string;
  feature: Task['feature'];
  model: ModelName;
  ok: boolean;
  output: unknown;
  error: string | null;
  usage: Usage | null;
  costUsd: number | null;
  latencyMs: number;
}

export function createClient(): Anthropic {
  // evals/.env 에 ANTHROPIC_API_KEY를 둔다 (.env는 커밋되지 않는다)
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env가 없으면 기존 환경 변수를 쓴다
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'API 키가 없어요. evals/.env 파일에 ANTHROPIC_API_KEY=sk-ant-... 한 줄을 넣어 주세요.',
    );
  }
  // 워크스페이스에 묶이지 않은 키는 어느 워크스페이스를 쓸지 헤더로 알려 줘야 한다
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic(
    workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {},
  );
}

/** 키 · 권한 문제면 모든 호출이 같은 이유로 실패하므로, 첫 호출 결과를 보고 바로 멈춘다 */
export function assertFirstCallOk(r: RunRecord): void {
  if (!r.ok && r.error?.startsWith('API 4')) {
    throw new Error(`첫 호출부터 실패해서 멈췄어요. API 키 설정을 확인해 주세요.\n${r.error}`);
  }
}

export function loadSamples(dir = SAMPLES_DIR): Sample[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.txt'));
  } catch {
    files = [];
  }
  if (files.length === 0) {
    throw new Error(
      `evals/${dir}/ 에 샘플(.txt)이 없어요. evals/examples/ 형식을 참고해 만들어 주세요.`,
    );
  }
  return files
    .sort()
    .map((f) => parseSample(f.replace(/\.txt$/, ''), readFileSync(join(dir, f), 'utf8')));
}

function callFor(task: Task) {
  switch (task.feature) {
    case 'analyze':
      return { ...FEATURES.analyze, prompt: FEATURES.analyze.prompt(task.request) };
    case 'simulate':
      return { ...FEATURES.simulate, prompt: FEATURES.simulate.prompt(task.request) };
    case 'score':
      return { ...FEATURES.score, prompt: FEATURES.score.prompt(task.request) };
  }
}

export async function runTask(client: Anthropic, model: ModelName, task: Task): Promise<RunRecord> {
  const { prompt, output, effort } = callFor(task);
  const started = Date.now();
  const { id, noThinking } = MODELS[model];
  const res = await generate(client, { model: id, prompt, schema: output, effort, noThinking });
  const usage = res.usage;
  return {
    key: task.key,
    feature: task.feature,
    model,
    ok: res.ok,
    output: res.ok ? res.data : res.raw,
    error: res.ok ? null : res.error,
    usage,
    costUsd: usage ? costUsd(model, usage) : null,
    latencyMs: Date.now() - started,
  };
}

/** 동시에 limit개씩 실행한다 (요청 한도 초과 방지) */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]!);
      }
    }),
  );
  return results;
}

/**
 * `models=haiku,sonnet only=score` 꼴의 인자를 읽는다.
 * `--models` 꼴은 PowerShell · npm이 중간에 가로채서 쓰지 않는다.
 */
export function parseOptions<K extends string>(
  argv: string[],
  keys: readonly K[],
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const arg of argv) {
    const [k, v] = arg.split('=', 2) as [string, string | undefined];
    if (!keys.includes(k as K) || !v)
      throw new Error(`알 수 없는 인자 "${arg}" (가능: ${keys.map((x) => `${x}=…`).join(' ')})`);
    out[k as K] = v;
  }
  return out;
}

export function parseList<T extends string>(value: string | undefined, all: readonly T[]): T[] {
  if (!value) return [...all];
  const picked = value.split(',').map((s) => s.trim());
  const bad = picked.filter((p) => !all.includes(p as T));
  if (bad.length > 0) throw new Error(`알 수 없는 값: ${bad.join(', ')} (가능: ${all.join(', ')})`);
  return picked as T[];
}
