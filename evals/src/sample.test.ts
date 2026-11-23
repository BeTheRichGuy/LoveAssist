import { describe, expect, it } from 'vitest';
import { loadSamples } from './lib';
import { parseSample, tasksFor } from './sample';

describe('parseSample', () => {
  it('예시 샘플을 읽는다', () => {
    const [first, second] = loadSamples('examples');
    expect(first!.partner).toEqual({
      label: '지우',
      stage: 'some',
      traits: ['답장이 느린 편'],
      memos: ['전시 보는 거 좋아함'],
    });
    expect(first!.lines[1]).toEqual({ speaker: 'partner', text: '아직 못 정했어ㅎㅎ 너는?' });
    expect(first!.drafts.map((d) => d.expectLow)).toEqual([false, false, true]);
    expect(second!.conflict).toBe(true);
  });

  it('호칭 대신 "상대:"로 써도 상대 메시지로 본다', () => {
    const s = parseSample('t', '호칭: 지우\n---\n상대: 안녕\n나: 안녕!');
    expect(s.lines.map((l) => l.speaker)).toEqual(['partner', 'me']);
  });

  it('누가 한 말인지 모르는 줄은 줄 내용과 함께 알려 준다', () => {
    expect(() => parseSample('t', '호칭: 지우\n---\n민수: 안녕')).toThrow(/민수: 안녕/);
  });

  it('잘못된 단계는 거부한다', () => {
    expect(() => parseSample('t', '단계: 결혼\n---\n나: 안녕')).toThrow(/단계/);
  });
});

describe('tasksFor', () => {
  it('감정소 · 시뮬레이션 · 답장 수만큼 채점 요청을 만든다', () => {
    const [s] = loadSamples('examples');
    const tasks = tasksFor(s!);
    expect(tasks.map((t) => t.key)).toEqual([
      '01-썸-주말약속/analyze',
      '01-썸-주말약속/simulate',
      '01-썸-주말약속/score/1',
      '01-썸-주말약속/score/2',
      '01-썸-주말약속/score/3',
    ]);
  });

  it('시뮬레이션 기록은 내 마지막 메시지에서 끝난다', () => {
    const s = parseSample('t', '---\n나: 뭐해\n상대: 그냥 있어\n나: 심심하다\n상대: ㅋㅋ');
    const sim = tasksFor(s).find((t) => t.feature === 'simulate');
    expect(sim?.feature === 'simulate' && sim.request.history.at(-1)).toEqual({
      speaker: 'me',
      text: '심심하다',
    });
  });

  it('내 메시지가 없으면 시뮬레이션은 건너뛴다', () => {
    const s = parseSample('t', '---\n상대: 안녕');
    expect(tasksFor(s).map((t) => t.feature)).toEqual(['analyze']);
  });
});
