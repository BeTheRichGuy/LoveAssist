import { generate } from '@loveassist/relay/llm';
import { FEATURES, PROMPT_VERSION } from '@loveassist/relay/prompts';
import type { ChatLine, SimulateRequest } from '@loveassist/shared';
import { createClient } from './lib';

// 연습 상대(시뮬레이션) 말투 점검: 말버릇이 많이 학습된 가상 상대와 몇 턴 대화해서
// 메시지 길이 · 이모지 · 말버릇 · 메모 언급이 과한지 센다. 가상 데이터만 쓴다 (실제 대화 없음).
// 실행: npm run eval:sim  (evals/.env의 API 키 사용, 1회 약 2~3원)

const PARTNER: SimulateRequest['partner'] = {
  label: '코코',
  stage: 'dating',
  traits: ['리액션이 큰 편', '서운한 걸 바로 말하는 편'],
  speech: [
    '반말, "자기야"라고 부름',
    'ㅋㅋㅋ를 자주 붙임',
    '문장 끝에 이모지를 가끔 씀',
    '"헐", "완전" 같은 감탄사를 씀',
    'ㅠ로 피곤함을 표현함',
  ],
  memos: ['기념일 · 처음 만난 날: 2월 22일', '좋아하는 것: 떡볶이, 산책'],
};

/** "나"의 대사 (상대 답장과 상관없이 같은 흐름으로) */
const MY_LINES = [
  '나 오늘 야근이라 좀 늦게 끝났어',
  '응 저녁은 편의점에서 대충 먹었어',
  '주말에 뭐 하고 싶어?',
  '좋아 그럼 토요일에 보자',
  '오늘 고생했어 푹 자',
];

const EMOJI = /\p{Extended_Pictographic}/gu;
const HABITS = [/ㅋㅋ/, /자기/, /헐/, /완전/, /ㅠ/];

async function main() {
  const client = createClient();
  const f = FEATURES.simulate;
  const history: ChatLine[] = [];
  const stats = { msgs: 0, chars: 0, emoji: 0, habits: 0, memo: 0, maxHabits: 0 };
  const rounds = Number(process.env.ROUNDS ?? 2);
  for (let round = 0; round < rounds; round++) {
    history.length = 0;
    for (let i = 0; i <= MY_LINES.length; i++) {
      const req: SimulateRequest = { partner: PARTNER, history: [...history] };
      const res = await generate(client, {
        model: f.model,
        prompt: f.prompt(req),
        schema: f.output,
        effort: f.effort,
        noThinking: f.noThinking,
      });
      if (!res.ok) throw new Error(res.error);
      const text = res.data.message;
      const habits = HABITS.filter((h) => h.test(text)).length;
      stats.msgs++;
      stats.chars += text.length;
      stats.emoji += (text.match(EMOJI) ?? []).length;
      stats.habits += habits;
      stats.maxHabits = Math.max(stats.maxHabits, habits);
      if (/2월 22일|기념일|떡볶이|산책/.test(text)) stats.memo++;
      console.log(`  코코(${res.data.mood}) ${text}`);
      history.push({ speaker: 'partner', text });
      if (i < MY_LINES.length) {
        console.log(`  나: ${MY_LINES[i]}`);
        history.push({ speaker: 'me', text: MY_LINES[i]! });
      }
    }
    console.log('---');
  }
  const n = stats.msgs;
  console.log(`프롬프트 ${PROMPT_VERSION} · 메시지 ${n}개`);
  console.log(`평균 길이 ${(stats.chars / n).toFixed(1)}자`);
  console.log(`이모지 있는 비율 ${((stats.emoji / n) * 100).toFixed(0)}% (개수 기준)`);
  console.log(`메시지당 말버릇 ${(stats.habits / n).toFixed(2)}개 · 최대 ${stats.maxHabits}개`);
  console.log(`메모(기념일 · 취향) 언급 ${stats.memo}/${n}`);
}

void main();
