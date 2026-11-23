import type { BaseRecord } from '@loveassist/shared';

// 상대 정보 메모 병합. 메모는 종류(기념일 · 좋아하는 것 …)마다 하나씩이다.
// 지운 메모는 배열에서 빼지 않고 deletedAt을 남긴다: DB에도 삭제 표시가 남아야
// 나중에 기기 간 동기화를 붙일 때 "지웠다"는 사실이 전달된다 (설계 원칙: soft delete).

type MemoLike<K extends string> = BaseRecord & { kind: K; text: string };

export function mergeMemos<K extends string>(
  existing: MemoLike<K>[],
  incoming: { kind: K; text: string }[],
  create: () => BaseRecord,
  now: string,
): MemoLike<K>[] {
  const wanted = new Map(incoming.map((m) => [m.kind, m.text]));
  const merged = existing.map((m) => {
    if (m.deletedAt !== null) return m;
    const text = wanted.get(m.kind);
    wanted.delete(m.kind);
    if (text === undefined) return { ...m, deletedAt: now, updatedAt: now };
    return text === m.text ? m : { ...m, text, updatedAt: now };
  });
  for (const [kind, text] of wanted) merged.push({ ...create(), kind, text });
  return merged;
}
