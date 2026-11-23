// C안 디자인 토큰
// 기준 화면 390×844, 터치 영역 최소 44px.

export const colors = {
  bg: '#15131B',
  /** 카드 · 상대 말풍선 */
  surface: '#211E2A',
  /** 하단 시트 */
  sheet: '#1C1924',
  /** 선택된 카드 배경 */
  accentSurface: '#2A2540',
  border: '#34303F',
  divider: '#2A2633',
  text: '#F2F0F7',
  textSoft: '#D8D4E2',
  textSub: '#A9A3B8',
  muted: '#6E6684',
  /** 버튼 · 내 말풍선 */
  accent: '#A594FF',
  onAccent: '#15131B',
  /** 낮은 점수 */
  warning: '#FF9A76',
  story: {
    accent: '#FFB3CF',
    accentSurface: '#2A2133',
    base: '#1E1A3A',
    scene: '#2B2650',
    dialog: 'rgba(21,19,27,0.94)',
    chrome: 'rgba(21,19,27,0.7)',
    dim: 'rgba(21,19,27,0.55)',
  },
} as const;

export const fonts = {
  /** 제목 · 점수 */
  display: 'BlackHanSans_400Regular',
  body: 'GothicA1_400Regular',
  medium: 'GothicA1_500Medium',
  bold: 'GothicA1_700Bold',
  /** 스토리 모드 대사 */
  story: 'GowunDodum_400Regular',
} as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 24 } as const;

export const MIN_TOUCH = 44;

/** 점수 색: 낮으면 경고색, 높으면 강조색 */
export function scoreColor(score: number): string {
  if (score < 55) return colors.warning;
  if (score >= 70) return colors.accent;
  return colors.text;
}
