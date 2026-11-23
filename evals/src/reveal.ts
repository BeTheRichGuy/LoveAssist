import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESULTS_DIR } from './lib';
import type { ModelName } from './models';
import { tally, type Votes } from './report';

// 블라인드 평가 결과 공개: 평가자들이 저장한 votes-*.json을 정답지와 맞춰 기능별 1등 횟수를 센다.
// 사용: npm run eval:reveal -- <votes 파일> [<votes 파일> ...]

const files = process.argv.slice(2);
if (files.length === 0) throw new Error('votes-*.json 파일 경로를 하나 이상 주세요');
const votes = files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as Votes);
const runIds = new Set(votes.map((v) => v.runId));
if (runIds.size !== 1)
  throw new Error(`서로 다른 실행의 평가가 섞였어요: ${[...runIds].join(', ')}`);
const runId = votes[0]!.runId;
const key = JSON.parse(readFileSync(join(RESULTS_DIR, runId, 'key.json'), 'utf8')) as Record<
  string,
  Record<string, ModelName>
>;

console.log(`실행 ${runId} · 평가자 ${votes.map((v) => v.evaluator).join(', ')}\n`);
for (const [feature, counts] of Object.entries(tally(key, votes))) {
  const line = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${m} ${n}`)
    .join(' · ');
  console.log(`${feature}: ${line}`);
}

// 두 사람 이상이면 같은 항목에서 같은 모델을 골랐는지 (평가가 믿을 만한지 가늠)
if (votes.length >= 2) {
  const [a, b] = votes as [Votes, Votes];
  const shared = Object.keys(a.picks).filter((k) => k in b.picks);
  const agree = shared.filter((k) => {
    const pick = (v: Votes) => (v.picks[k] === 'same' ? 'same' : key[k]?.[v.picks[k]!]);
    return pick(a) === pick(b);
  }).length;
  console.log(`\n${a.evaluator} · ${b.evaluator} 일치율: ${agree}/${shared.length}`);
}
