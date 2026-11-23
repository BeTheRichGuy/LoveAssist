import { describe, expect, it } from 'vitest';
import type { PartnerContext } from '@loveassist/shared';
import { FEATURES } from '../src/prompts';

const partner: PartnerContext = {
  label: '지우',
  stage: 'some',
  traits: ['답장이 느린 편'],
  memos: [],
};

describe('프롬프트', () => {
  it('대화를 "나"와 상대 호칭으로 옮기고 상대 정보를 담는다', () => {
    const { user } = FEATURES.analyze.prompt({
      partner,
      mode: 'normal',
      lines: [
        { speaker: 'me', text: '뭐해?' },
        { speaker: 'partner', text: '그냥 있어' },
      ],
    });
    expect(user).toContain('나: 뭐해?\n지우: 그냥 있어');
    expect(user).toContain('관계 단계: 썸');
    expect(user).not.toContain('말투:');
    expect(user).toContain('성향: 답장이 느린 편');
    expect(user).not.toContain('메모:');
  });

  it('갈등 모드일 때만 갈등 해결 안내를 넣는다', () => {
    const req = { partner, lines: [{ speaker: 'partner' as const, text: '서운해' }] };
    expect(FEATURES.analyze.prompt({ ...req, mode: 'conflict' }).user).toContain('갈등 해결');
    expect(FEATURES.analyze.prompt({ ...req, mode: 'normal' }).user).not.toContain('갈등 해결');
  });

  it('시뮬레이션: 대화 기록이 비어 있으면 상대가 먼저 말을 거는 첫 메시지를 요청한다', () => {
    const opening = FEATURES.simulate.prompt({ partner, history: [] });
    expect(opening.user).toContain('먼저 말을 거는 첫 메시지');
    const reply = FEATURES.simulate.prompt({
      partner,
      history: [{ speaker: 'me', text: '뭐해?' }],
    });
    expect(reply.user).toContain('나: 뭐해?');
    expect(reply.user).not.toContain('먼저 말을 거는');
  });

  it('채점 프롬프트는 채점할 답장과 조종성 감점 규칙을 담는다', () => {
    const { system, user } = FEATURES.score.prompt({ partner, history: [], draft: '그럼 말자' });
    expect(user).toContain('나: 그럼 말자');
    expect(system).toContain('총점 35 이하');
  });
  it('승인된 내 말투가 있을 때만 감정소 · 채점 프롬프트에 넣는다', () => {
    const lines = [{ speaker: 'partner' as const, text: '뭐해?' }];
    const style = ['반말, 짧게 끊어 보냄', 'ㅋㅋ를 자주 붙임'];
    const withStyle = FEATURES.analyze.prompt({ partner, mode: 'normal', lines, myStyle: style });
    expect(withStyle.user).toContain(
      '[나의 평소 말투 (사용자가 승인한 요약)]\n- 반말, 짧게 끊어 보냄',
    );
    expect(FEATURES.analyze.prompt({ partner, mode: 'normal', lines }).user).not.toContain(
      '나의 평소 말투',
    );
    const score = FEATURES.score.prompt({ partner, history: lines, draft: 'ㅇㅇ', myStyle: style });
    expect(score.user).toContain('- ㅋㅋ를 자주 붙임');
    expect(FEATURES.score.prompt({ partner, history: lines, draft: 'ㅇㅇ' }).user).not.toContain(
      '나의 평소 말투',
    );
  });

  it('말투 학습 프롬프트는 내 메시지 수와 표본 대화를 담고 대화 내용은 요약하지 말라고 한다', () => {
    const { system, user } = FEATURES.style.prompt({
      partnerLabel: '지우',
      lines: [
        { speaker: 'me', text: 'ㅋㅋ 웅' },
        { speaker: 'partner', text: '주말에 뭐해?' },
        { speaker: 'me', text: '집콕할듯' },
      ],
    });
    expect(user).toContain('"나"의 메시지 2개 · 전체 3줄');
    expect(user).toContain('나: ㅋㅋ 웅\n지우: 주말에 뭐해?');
    expect(system).toContain('사실은 절대 쓰지 않는다');
  });

  it('말투 학습 결과에서 민감정보로 보이는 항목은 뺀다', () => {
    const out = FEATURES.style.postprocess({
      myStyle: ['반말을 씀', '교회 얘기를 자주 함'],
      myStyleTips: ['ㅋㅋ를 웃긴 포인트에만 써 보세요', '교회 얘기는 줄여 보세요'],
      partnerTraits: ['답장이 빠른 편', '우울증 약을 먹는 편'],
      partnerSpeech: ['ㅎㅎ를 자주 씀', '성당 다녀온 얘기를 함'],
    });
    expect(out).toEqual({
      myStyle: ['반말을 씀'],
      myStyleTips: ['ㅋㅋ를 웃긴 포인트에만 써 보세요'],
      partnerTraits: ['답장이 빠른 편'],
      partnerSpeech: ['ㅎㅎ를 자주 씀'],
    });
  });
});

describe('상대 말투', () => {
  it('승인된 상대 말투가 있으면 상대 정보에 넣어 연습 상대가 그 말투로 말하게 한다', () => {
    const { system, user } = FEATURES.simulate.prompt({
      partner: { ...partner, speech: ['반말에 ㅎㅎ를 자주 씀'] },
      history: [],
    });
    expect(user).toContain('반말에 ㅎㅎ를 자주 씀');
    expect(user).toContain('한 메시지에 하나 이하');
    expect(system).toContain('한 메시지에 말버릇');
  });

  it('메모는 배경 정보로만 쓰고 메시지는 짧게 하라고 한다', () => {
    const { system, user } = FEATURES.simulate.prompt({
      partner: { ...partner, memos: ['좋아하는 것: 떡볶이'] },
      history: [],
    });
    expect(user).toContain('대화와 관련될 때만 언급');
    expect(system).toContain('50자를 넘기지 않는다');
  });
});
