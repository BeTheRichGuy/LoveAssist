import { describe, expect, it } from 'vitest';

import { mergeMemos } from './memos';

const T0 = '2026-10-01T00:00:00.000Z';
const NOW = '2026-10-13T00:00:00.000Z';
let seq = 0;
const create = () => ({ id: `new-${++seq}`, createdAt: NOW, updatedAt: NOW, deletedAt: null });
const memo = (id: string, kind: string, text: string, deletedAt: string | null = null) => ({
  id,
  kind,
  text,
  createdAt: T0,
  updatedAt: T0,
  deletedAt,
});

describe('mergeMemos', () => {
  it('그대로인 메모는 손대지 않는다', () => {
    const existing = [memo('a', 'likes', '전시')];
    expect(mergeMemos(existing, [{ kind: 'likes', text: '전시' }], create, NOW)).toEqual(existing);
  });

  it('내용이 바뀌면 같은 기록을 고친다 (새 기록을 만들지 않는다)', () => {
    const merged = mergeMemos(
      [memo('a', 'likes', '전시')],
      [{ kind: 'likes', text: '전시, 디저트' }],
      create,
      NOW,
    );
    expect(merged).toEqual([{ ...memo('a', 'likes', '전시, 디저트'), updatedAt: NOW }]);
  });

  it('비운 메모는 지우지 않고 삭제 표시를 남긴다 (동기화 대비)', () => {
    const merged = mergeMemos([memo('a', 'likes', '전시')], [], create, NOW);
    expect(merged).toEqual([{ ...memo('a', 'likes', '전시'), deletedAt: NOW, updatedAt: NOW }]);
  });

  it('새 종류는 새 기록으로 추가하고, 이미 지운 기록은 그대로 둔다', () => {
    const gone = memo('old', 'free', '예전 메모', T0);
    const merged = mergeMemos([gone], [{ kind: 'free', text: '새 메모' }], create, NOW);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(gone);
    expect(merged[1]).toMatchObject({ kind: 'free', text: '새 메모', deletedAt: null });
  });
});
