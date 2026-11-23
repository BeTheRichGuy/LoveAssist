import { describe, expect, it } from 'vitest';

import { maskName } from './mask-name';

describe('maskName', () => {
  it('이름으로 쓰인 닉네임만 가린다 (조사 · 호칭이 붙어도)', () => {
    expect(maskName('별이 오늘 피곤하대', '별')).toBe('상대 오늘 피곤하대');
    expect(maskName('별아 뭐해?', '별')).toBe('상대 뭐해?');
    expect(maskName('코코한테 먼저 연락해 봐요', '코코')).toBe('상대한테 먼저 연락해 봐요');
    expect(maskName('코코', '코코')).toBe('상대');
  });

  it('다른 낱말 속 글자는 건드리지 않는다', () => {
    expect(maskName('별로 서운하지 않은 것 같아요', '별')).toBe('별로 서운하지 않은 것 같아요');
    expect(maskName('특별한 날이에요', '별')).toBe('특별한 날이에요');
    expect(maskName('코코아 마실래?', '코코')).toBe('코코아 마실래?');
  });
});
