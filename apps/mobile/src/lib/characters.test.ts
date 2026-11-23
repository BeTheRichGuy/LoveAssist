import { describe, expect, it } from 'vitest';

import { CHARACTER_IDS, CHARACTERS, recommendCharacter } from './characters';

describe('스토리 모드 캐릭터 추천', () => {
  it('승인된 성향의 키워드로 고른다', () => {
    expect(recommendCharacter(['장난을 자주 치는 편', '농담으로 넘기는 편'])).toBe('playful');
    expect(recommendCharacter(['다정하게 챙겨 주는 편'])).toBe('gentle');
  });

  it('외형을 정하면 그 안에서 고른다', () => {
    expect(recommendCharacter(['다정하게 챙겨 주는 편'], 'm')).not.toBe('gentle');
    expect(CHARACTERS[recommendCharacter(['장난을 치는 편'], 'f')].look).toBe('f');
  });

  it('성향이 없으면 첫 캐릭터', () => {
    expect(recommendCharacter([])).toBe(CHARACTER_IDS[0]);
  });
});
