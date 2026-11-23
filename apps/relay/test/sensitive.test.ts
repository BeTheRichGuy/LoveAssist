import { describe, expect, it } from 'vitest';
import { isSensitiveText } from '@loveassist/shared';

describe('isSensitiveText', () => {
  it.each([
    '우울증 약을 먹는 편',
    '정신과 상담을 받는 중',
    '교회를 열심히 다니는 편',
    '불교 신자',
    '보수 성향 뉴스를 자주 봄',
    '스킨십을 좋아하는 편',
    '부모님이 이혼하셔서 가족 얘기를 피함',
  ])('민감한 내용은 걸러 낸다: %s', (text) => {
    expect(isSensitiveText(text)).toBe(true);
  });

  it.each([
    '불안할 때 질문이 많아지는 편',
    '서운한 걸 돌려 말하는 편',
    '답장이 느린 편',
    '전시 보는 걸 좋아함',
    '계획 세우는 걸 좋아함',
    '연애에 보수적인 편',
    '진보적인 데이트 코스를 좋아함',
  ])('평범한 소통 성향은 남긴다: %s', (text) => {
    expect(isSensitiveText(text)).toBe(false);
  });
});
