import type { ReplyScore } from '@loveassist/shared';

import { withIGa } from './korean';

// 채점 결과를 화면용 표현으로 바꾼다. 엔진(점수)은 하나고, 스코어 · 스토리 모드는 표현만 다르다.

/** 스코어 모드: 점수 구간별 한 줄 평 */
export function verdictLabel(total: number): string {
  if (total >= 85) return '최고의 한 수';
  if (total >= 70) return '좋은 한 수';
  if (total >= 55) return '무난한 한 수';
  return '아쉬운 한 수';
}

/** 스토리 모드: 점수 → 예상 호감 변화. 62점 근처가 0 */
export function affinityDelta(total: number): number {
  return Math.max(-8, Math.min(8, Math.round((total - 62) / 2.5)));
}

/** 스토리 모드: 점수 → 캐릭터 반응 문장 */
export function storyReaction(total: number, name: string): string {
  const who = withIGa(name);
  if (total >= 85) return `${who} 무척 좋아할 것 같아요`;
  if (total >= 70) return `${who} 기분 좋아할 것 같아요`;
  if (total >= 55) return `${who} 무난하게 받아들일 것 같아요`;
  return `${who} 조금 서운해할 것 같아요`;
}

export const AXIS_LABELS: { key: keyof ReplyScore['axes']; label: string }[] = [
  { key: 'empathy', label: '공감' },
  { key: 'fit', label: '성향' },
  { key: 'tone', label: '톤' },
  { key: 'tempo', label: '템포' },
];

export const AFFINITY_START = 50;

export function clampAffinity(value: number): number {
  return Math.max(0, Math.min(100, value));
}
