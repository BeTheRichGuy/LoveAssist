import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROMPT_VERSION } from '@loveassist/relay/prompts';
import { blindHtml, type BlindItem } from './blind-page';
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
import { assignLabels, costTable } from './report';
import { tasksFor, type Task } from './sample';

// 샘플 × 기능 × 모델을 모두 돌려 결과 · 원가 표 · 블라인드 평가 화면을 만든다.
// 사용: npm run eval:run [models=haiku,sonnet] [only=analyze,score]

const FEATURES = ['analyze', 'simulate', 'score'] as const;

const values = parseOptions(process.argv.slice(2), ['models', 'only']);
// Opus는 1차 비교 후 제외했다 (필요하면 models=haiku,sonnet,opus)
const models = parseList(values.models ?? 'haiku,sonnet', Object.keys(MODELS) as ModelName[]);
const features = parseList(values.only, FEATURES);

const client = createClient();
const samples = loadSamples();
const tasks = samples.flatMap(tasksFor).filter((t) => features.includes(t.feature));
const jobs = tasks.flatMap((task) => models.map((model) => ({ task, model })));

console.log(
  `샘플 ${samples.length}개 · 요청 ${tasks.length}개 · 모델 ${models.join(', ')} → 호출 ${jobs.length}회`,
);
const first = await runTask(client, jobs[0]!.model, jobs[0]!.task);
assertFirstCallOk(first);

const runId = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
const dir = join(RESULTS_DIR, runId);
mkdirSync(dir, { recursive: true });

let done = 1;
const rest = await pool(jobs.slice(1), 4, async ({ task, model }) => {
  const r = await runTask(client, model, task);
  done++;
  if (!r.ok) console.log(`  실패 ${task.key} [${model}] ${r.error}`);
  if (done % 10 === 0 || done === jobs.length) console.log(`  ${done}/${jobs.length}`);
  return r;
});
const runs = [first, ...rest];

const total = runs.reduce((s, r) => s + (r.costUsd ?? 0), 0);
writeFileSync(
  join(dir, 'runs.json'),
  JSON.stringify({ runId, promptVersion: PROMPT_VERSION, models, tasks, runs }, null, 2),
);
writeFileSync(
  join(dir, 'cost.md'),
  `# 원가 (${runId}, 프롬프트 ${PROMPT_VERSION})\n\n${costTable(runs)}\n이번 실행 총비용: $${total.toFixed(3)}\n`,
);

// 블라인드 평가: 항목마다 모델 순서를 섞는다
const key = assignLabels(
  tasks.map((t) => t.key),
  models,
);
const byKey = new Map<string, Task>(tasks.map((t) => [t.key, t]));
const items: BlindItem[] = Object.entries(key).map(([k, labels]) => ({
  key: k,
  feature: byKey.get(k)!.feature,
  request: byKey.get(k)!.request,
  options: Object.fromEntries(
    Object.entries(labels).map(([label, model]) => {
      const r = runs.find((x) => x.key === k && x.model === model)!;
      return [label, { ok: r.ok, output: r.output, error: r.error }];
    }),
  ),
}));
writeFileSync(join(dir, 'key.json'), JSON.stringify(key, null, 2));
writeFileSync(join(dir, 'blind.html'), blindHtml(runId, items));

console.log(`\n완료. 총비용 $${total.toFixed(3)}`);
console.log(`  원가 표:    evals/results/${runId}/cost.md`);
console.log(
  `  블라인드:   evals/results/${runId}/blind.html  (브라우저로 열기, key.json은 평가 끝까지 열지 않기)`,
);
