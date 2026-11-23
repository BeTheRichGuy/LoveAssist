import type { ChatLine, PartnerContext, RelationshipStage } from '@loveassist/shared';

// 세 프롬프트가 같이 쓰는 조각. 대화와 상대 정보를 프롬프트 텍스트로 옮긴다.
// 들어오는 텍스트는 앱에서 이미 실명이 "나"와 닉네임(없으면 "상대")으로 치환된 상태다.

export interface Prompt {
  system: string;
  user: string;
}

const STAGE_LABEL: Record<RelationshipStage, string> = {
  some: '썸',
  dating: '연애 중',
  slump: '권태기',
  breakup: '이별 후',
};

export function renderPartner(p: PartnerContext): string {
  const lines = [`- 호칭: ${p.label}`, `- 관계 단계: ${STAGE_LABEL[p.stage]}`];
  if (p.traits.length > 0) lines.push(`- 성향: ${p.traits.join(' / ')}`);
  if (p.speech && p.speech.length > 0) {
    lines.push(`- 말투 (평소 분위기, 한 메시지에 하나 이하로만 드러낸다): ${p.speech.join(' / ')}`);
  }
  if (p.memos.length > 0) {
    lines.push(`- 메모 (배경 정보, 대화와 관련될 때만 언급): ${p.memos.join(' / ')}`);
  }
  return lines.join('\n');
}

/** 승인된 내 말투 요약. 없으면 빈 문자열 */
export function renderMyStyle(style: string[] | undefined): string {
  if (!style || style.length === 0) return '';
  return `[나의 평소 말투 (사용자가 승인한 요약)]\n${style.map((s) => `- ${s}`).join('\n')}`;
}

export function renderChat(lines: ChatLine[], partnerLabel: string): string {
  return lines.map((l) => `${l.speaker === 'me' ? '나' : partnerLabel}: ${l.text}`).join('\n');
}

/** 세 기능 모두에 들어가는 안전 · 개인정보 원칙 */
export const SHARED_RULES = `- 사용자는 성인이다. 건강한 관계를 돕는 것이 목적이다.
- 상대를 조종하거나 시험하는 말(일부러 불안하게 만드는 밀당, 질투 유발, 읽씹 전략, 죄책감 자극, 이별 협박)은 권하지 않는다. 따뜻함이 바탕인 가벼운 장난 · 텐션 조절은 괜찮다.
- 건강 · 성생활 · 종교 · 정치 성향 같은 민감한 정보는 추측하거나 언급하지 않는다.
- 대화에 없는 사실을 지어내지 않는다.
- 한국어 메신저 말투로 쓴다. 답장 예시는 실제로 바로 보낼 수 있는 문장이어야 한다.`;
