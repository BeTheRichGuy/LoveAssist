import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROMPT_VERSION } from '@loveassist/relay/prompts';
import {
  assertFirstCallOk,
  createClient,
  loadSamples,
  parseList,
  parseOptions,
  pool,
  RESULTS_DIR,
  runTask,
} from './lib';
import { MODELS, type ModelName } from './models';
import { tasksFor } from './sample';

// 채점 점검: 같은 답장을 여러 번 채점해 점수 편차를 보고, "낮아야 함" 답장이 실제로 낮은지 확인한다.
// 사용: npm run eval:consistency [models=haiku,sonnet] [repeat=5]
// 채점은 저렴한 모델로 돌리기로 했으므로 기본값은 haiku, sonnet.

/** 같은 답장의 최고 · 최저 점수 차이가 이 값 이하면 통과 */
const MAX_SPREAD = 10;
/** "낮아야 함" 답장은 모든 회차가 이 값 이하여야 통과 */
const LOW_CEILING = 40;

const values = parseOptions(process.argv.slice(2), ['models', 'repeat']);
const models = parseList(values.models ?? 'haiku,sonnet', Object.keys(MODELS) as ModelName[]);
const repeat = Number(values.repeat ?? 5);
if (!Number.isInteger(repeat) || repeat < 2) throw new Error('repeat는 2 이상의 정수');

const client = createClient();
const tasks = loadSamples()
  .flatMap(tasksFor)
  .filter((t) => t.feature === 'score');
if (tasks.length === 0) throw new Error('샘플에 "채점:" 줄이 없어요');
const jobs = tasks.flatMap((task) =>
  models.flatMap((model) => Array.from({ length: repeat }, () => ({ task, model }))),
);
console.log(
  `답장 ${tasks.length}개 × 모델 ${models.length}개 × ${repeat}회 → 호출 ${jobs.length}회`,
);

const first = await runTask(client, jobs[0]!.model, jobs[0]!.task);
assertFirstCallOk(first);
const rest = await pool(jobs.slice(1), 4, ({ task, model }) => runTask(client, model, task));
const runs = [first, ...rest];

const rows = ['| 답장 | 모델 | 점수 | 편차 | 판정 |', '| --- | --- | --- | --- | --- |'];
const summary: Record<string, { pass: number; total: number }> = {};
for (const task of tasks) {
  if (task.feature !== 'score') continue;
  for (const model of models) {
    const rs = runs.filter((r) => r.key === task.key && r.model === model);
    const scores = rs.filter((r) => r.ok).map((r) => (r.output as { total: number }).total);
    const spread = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : NaN;
    const problems = [];
    if (scores.length < rs.length) problems.push(`실패 ${rs.length - scores.length}회`);
    if (spread > MAX_SPREAD) problems.push(`편차 큼`);
    if (task.expectLow && scores.some((s) => s > LOW_CEILING)) problems.push(`낮아야 하는데 높음`);
    summary[model] ??= { pass: 0, total: 0 };
    summary[model].total++;
    if (problems.length === 0) summary[model].pass++;
    const draft = (task.expectLow ? '⚠️ ' : '') + task.request.draft.replace(/\|/g, '/');
    rows.push(
      `| ${draft} | ${model} | ${scores.join(', ')} | ${spread} | ${problems.join(', ') || '통과'} |`,
    );
  }
}

const name = `consistency-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`;
const dir = join(RESULTS_DIR, name);
mkdirSync(dir, { recursive: true });
const cost = runs.reduce((s, r) => s + (r.costUsd ?? 0), 0);
const head = Object.entries(summary)
  .map(([m, s]) => `- ${m}: ${s.pass}/${s.total} 통과`)
  .join('\n');
writeFileSync(
  join(dir, 'consistency.md'),
  `# 채점 일관성 (프롬프트 ${PROMPT_VERSION}, ${repeat}회 반복)\n\n` +
    `통과 기준: 편차 ${MAX_SPREAD}점 이하, ⚠️(낮아야 함) 답장은 모두 ${LOW_CEILING}점 이하\n\n${head}\n\n${rows.join('\n')}\n\n총비용 $${cost.toFixed(3)}\n`,
);
console.log(`\n${head}\n총비용 $${cost.toFixed(3)}\n결과: evals/results/${name}/consistency.md`);
