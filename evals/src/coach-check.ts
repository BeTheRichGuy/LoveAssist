import { generate } from '@loveassist/relay/llm';
import { FEATURES, PROMPT_VERSION } from '@loveassist/relay/prompts';
import type { ChatLine, ScoreRequest } from '@loveassist/shared';
import { createClient } from './lib';

// 연애 코치 기준 채점 점검: "딱 봐도 아닌 답장"은 낮게, 짧아도 맞는 답장 · 가벼운 장난은 제대로 받는지 본다.
// 가상 대화만 쓴다. 기준은 docs/coaching/카톡-코칭-기준.md. 실행: npm run eval:coach (1회 약 5원)

const PARTNER: ScoreRequest['partner'] = {
  label: '하늘',
  stage: 'some',
  traits: ['리액션이 큰 편'],
  speech: [],
  memos: [],
};
/** 사용자가 학습한 내 말투 (나쁜 습관이 섞여 있다) */
const MY_STYLE = ['반말, 짧게 끊어 보냄', 'ㅋㅋㅋ를 거의 모든 문장에 붙임', '이모지를 자주 씀'];

type Case = { name: string; partner: string; draft: string; min: number; max: number };
const CASES: Case[] = [
  {
    name: 'ㅋㅋ 남발 (질문엔 답했지만 성의 없음)',
    partner: '오늘 저녁 뭐 먹었어?',
    draft: '나 오늘 ㅋㅋㅋ 김치찌개 먹었지 ㅋㅋㅋ',
    min: 0,
    max: 60,
  },
  {
    name: '답하고 되묻기',
    partner: '오늘 저녁 뭐 먹었어?',
    draft: '김치찌개 먹었어! 너는 뭐 먹었어?',
    min: 75,
    max: 100,
  },
  {
    name: '힘든 얘기에 ㅋㅋ',
    partner: '오늘 진짜 힘들었어ㅠ 팀장님한테 엄청 혼났어',
    draft: 'ㅋㅋㅋ 헐 왜 혼났는데 ㅋㅋ',
    min: 0,
    max: 45,
  },
  {
    name: '짧아도 맞는 마무리',
    partner: '나 이제 잘게 내일 일찍 일어나야 돼',
    draft: '응 푹 자 내일 화이팅',
    min: 75,
    max: 100,
  },
  {
    name: '가벼운 장난 · 튕김',
    partner: '보고 싶었어?',
    draft: '음 조금? ㅎㅎ 너는?',
    min: 70,
    max: 100,
  },
  {
    name: '이모지 폭탄',
    partner: '이번 주말에 영화 볼래?',
    draft: '좋아 😍😍😍🥰🥰 완전 좋아 💕💕',
    min: 0,
    max: 65,
  },
  {
    name: '장문 · 질문 폭탄 (상대는 짧게 말함)',
    partner: '응 좋아',
    draft:
      '진짜? 그럼 몇 시에 볼까? 어디서 볼래? 뭐 먹고 싶어? 나는 다 좋은데 너 편한 데로 하자 영화는 뭐 볼지도 정해야겠다',
    min: 0,
    max: 60,
  },
  {
    name: '질투 유발 (조종)',
    partner: '어제 왜 연락이 없었어?',
    draft: '아 어제 다른 여자애랑 밥 먹느라 ㅋㅋ',
    min: 0,
    max: 35,
  },
  // 아래는 프롬프트 예시에 없는 사례 (일반화 확인용)
  {
    name: '[새 사례] 맞장구마다 ㅋㅋ',
    partner: '이번 주 너무 바빴어',
    draft: 'ㅋㅋㅋㅋ 고생했네 ㅋㅋ 나도 바빴어 ㅋㅋㅋ',
    min: 0,
    max: 55,
  },
  {
    name: '[새 사례] 관심 보이며 이어 가기',
    partner: '나 오늘 머리 잘랐어!',
    draft: '오 궁금하다 사진 보여줘 ㅎㅎ',
    min: 75,
    max: 100,
  },
  {
    name: '[새 사례] 장난스러운 되받기',
    partner: '주말에 뭐 해?',
    draft: '비밀ㅎㅎ 왜 데이트 신청하게?',
    min: 70,
    max: 100,
  },
  {
    name: '[새 사례] 일부러 애태우기 (나쁜 밀당)',
    partner: '답장이 왜 이렇게 늦어?',
    draft: '일부러 늦게 보낸 건데 ㅋㅋ 애태우는 맛이 있잖아',
    min: 0,
    max: 35,
  },
  {
    name: '[새 사례] 무성의 단답',
    partner: '오늘 처음 간 카페 진짜 예뻤어 다음에 같이 가자',
    draft: 'ㅇㅇ',
    min: 0,
    max: 40,
  },
];

async function main() {
  const client = createClient();
  const f = FEATURES.score;
  const reps = Number(process.env.REPS ?? 2);
  let pass = 0;
  for (const c of CASES) {
    const history: ChatLine[] = [{ speaker: 'partner', text: c.partner }];
    const req: ScoreRequest = { partner: PARTNER, history, draft: c.draft, myStyle: MY_STYLE };
    const totals: number[] = [];
    let tip = '';
    for (let i = 0; i < reps; i++) {
      const res = await generate(client, {
        model: f.model,
        prompt: f.prompt(req),
        schema: f.output,
        effort: f.effort,
        noThinking: f.noThinking,
      });
      if (!res.ok) throw new Error(res.error);
      totals.push(res.data.total);
      tip = res.data.tip;
    }
    const ok = totals.every((t) => t >= c.min && t <= c.max);
    if (ok) pass++;
    console.log(
      `${ok ? '통과' : '실패'}  ${c.name}: ${totals.join(', ')}점 (기대 ${c.min}~${c.max})`,
    );
    console.log(`      팁: ${tip}`);
  }
  console.log(`프롬프트 ${PROMPT_VERSION} · ${pass}/${CASES.length} 통과`);
}

void main();
