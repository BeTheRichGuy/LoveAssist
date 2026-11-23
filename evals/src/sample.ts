import {
  AnalyzeRequest,
  PartnerContext,
  type RelationshipStage,
  ScoreRequest,
  SimulateRequest,
  type ChatLine,
} from '@loveassist/shared';

// 대화 샘플 파일(evals/samples/*.txt) 형식. 형식 예시는 evals/examples/ 참고.
//
//   호칭: 지우            ← 상대 닉네임 (대화에서도 이 이름으로 쓴다)
//   단계: 썸              ← 썸 / 연애 중 / 권태기 / 이별 후
//   갈등: 없음            ← 없음 / 있음
//   성향: 답장이 느린 편   ← 여러 개면 줄을 반복
//   메모: 고양이 키움
//   ---
//   나: 오늘 뭐 했어?
//   지우: 집에서 쉬었어
//   ---
//   채점: 푹 쉬었어? 다행이다     ← 마지막 상대 메시지에 보낼 답장 후보
//   채점(낮아야 함): 나도 바빠서 늦게 답할게   ← 조종 · 밀당 등 낮은 점수가 나와야 하는 답장

export interface Draft {
  text: string;
  expectLow: boolean;
}

export interface Sample {
  id: string;
  partner: PartnerContext;
  conflict: boolean;
  lines: ChatLine[];
  drafts: Draft[];
}

const STAGES: Record<string, RelationshipStage> = {
  썸: 'some',
  '연애 중': 'dating',
  권태기: 'slump',
  '이별 후': 'breakup',
};

export function parseSample(id: string, text: string): Sample {
  const sections = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .reduce<string[][]>(
      (acc, l) => {
        if (l === '---') acc.push([]);
        else acc[acc.length - 1]!.push(l);
        return acc;
      },
      [[]],
    );
  if (sections.length < 2) throw new Error(`${id}: '---'로 상대 정보와 대화를 나눠 주세요`);
  const [head, chat, drafts = []] = sections as [string[], string[], string[]?];

  const fields = new Map<string, string[]>();
  for (const l of head) {
    const m = /^([^:]+):\s*(.+)$/.exec(l);
    if (!m) throw new Error(`${id}: 알 수 없는 줄 "${l}"`);
    fields.set(m[1]!, [...(fields.get(m[1]!) ?? []), m[2]!]);
  }
  const label = fields.get('호칭')?.[0] ?? '상대';
  const stageText = fields.get('단계')?.[0] ?? '썸';
  const stage = STAGES[stageText];
  if (!stage) throw new Error(`${id}: 단계는 ${Object.keys(STAGES).join(' / ')} 중 하나`);
  const conflictText = fields.get('갈등')?.[0] ?? '없음';
  if (conflictText !== '없음' && conflictText !== '있음') {
    throw new Error(`${id}: 갈등은 없음 / 있음 중 하나`);
  }

  const lines = chat.map((l): ChatLine => {
    const m = /^([^:]+):\s*(.+)$/.exec(l);
    const who = m?.[1]!.trim();
    if (who === '나') return { speaker: 'me', text: m![2]! };
    if (who === label || who === '상대') return { speaker: 'partner', text: m![2]! };
    throw new Error(`${id}: 대화 줄은 "나:" 또는 "${label}:"로 시작해야 해요 → "${l}"`);
  });

  return {
    id,
    partner: PartnerContext.parse({
      label,
      stage,
      traits: fields.get('성향') ?? [],
      memos: fields.get('메모') ?? [],
    }),
    conflict: conflictText === '있음',
    lines,
    drafts: drafts.map((l) => {
      const m = /^채점(\(낮아야 함\))?:\s*(.+)$/.exec(l);
      if (!m) throw new Error(`${id}: 답장 후보는 "채점:"으로 시작해야 해요 → "${l}"`);
      return { text: m[2]!, expectLow: m[1] !== undefined };
    }),
  };
}

/** 샘플 하나에서 나오는 기능별 요청. key는 결과 · 블라인드 평가에서 항목을 가리키는 이름이다. */
export type Task =
  | { key: string; feature: 'analyze'; request: AnalyzeRequest }
  | { key: string; feature: 'simulate'; request: SimulateRequest }
  | { key: string; feature: 'score'; request: ScoreRequest; expectLow: boolean };

export function tasksFor(s: Sample): Task[] {
  const tasks: Task[] = [
    {
      key: `${s.id}/analyze`,
      feature: 'analyze',
      request: AnalyzeRequest.parse({
        lines: s.lines,
        partner: s.partner,
        mode: s.conflict ? 'conflict' : 'normal',
      }),
    },
  ];
  // 시뮬레이션: 내 마지막 메시지까지를 기록으로 주고 상대의 다음 말을 받는다
  const lastMine = s.lines.map((l) => l.speaker).lastIndexOf('me');
  if (lastMine >= 0) {
    tasks.push({
      key: `${s.id}/simulate`,
      feature: 'simulate',
      request: SimulateRequest.parse({
        partner: s.partner,
        history: s.lines.slice(0, lastMine + 1).slice(-30),
      }),
    });
  }
  s.drafts.forEach((d, i) => {
    tasks.push({
      key: `${s.id}/score/${i + 1}`,
      feature: 'score',
      request: ScoreRequest.parse({
        partner: s.partner,
        history: s.lines.slice(-30),
        draft: d.text,
      }),
      expectLow: d.expectLow,
    });
  });
  return tasks;
}
