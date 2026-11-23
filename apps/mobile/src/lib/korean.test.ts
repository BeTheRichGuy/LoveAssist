import { describe, expect, it } from 'vitest';

import { withEulReul, withIGa, withWaGwa } from './korean';

describe('조사', () => {
  it('받침 유무에 따라 고른다', () => {
    expect(withIGa('코코')).toBe('코코가');
    expect(withIGa('민준')).toBe('민준이');
    expect(withWaGwa('코코')).toBe('코코와');
    expect(withWaGwa('민준')).toBe('민준과');
    expect(withEulReul('하늘')).toBe('하늘을');
  });

  it('한글이 아니면 받침 없음으로 본다', () => {
    expect(withIGa('Jay')).toBe('Jay가');
  });
});
