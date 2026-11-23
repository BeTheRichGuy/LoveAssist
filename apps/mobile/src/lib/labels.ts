import type { ConflictLevel, RelationshipStage, SignalLevel } from '@loveassist/shared';

export const STAGE_OPTIONS: { value: RelationshipStage; title: string; description: string }[] = [
  { value: 'some', title: '썸', description: '고백 전까지' },
  { value: 'dating', title: '연애 중', description: '사귀는 사이' },
  { value: 'slump', title: '권태기', description: '예전 같지 않아요' },
  { value: 'breakup', title: '이별 후', description: '재회 고민 중' },
];

export const CONFLICT_OPTIONS: { value: ConflictLevel; title: string; description: string }[] = [
  { value: 'none', title: '없어요', description: '평소처럼 잘 지내요' },
  { value: 'some', title: '조금 있어요', description: '서운한 일이 쌓였어요' },
  { value: 'serious', title: '크게 다퉜어요', description: '화해가 필요해요' },
];

export const stageTitle = (s: RelationshipStage) =>
  STAGE_OPTIONS.find((o) => o.value === s)?.title ?? s;

export const SIGNAL_LEVEL_LABEL: Record<SignalLevel, string> = {
  low: '낮음',
  mid: '중간',
  high: '높음',
};
