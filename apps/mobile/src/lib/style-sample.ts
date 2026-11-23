import type { ChatLine } from '@loveassist/shared';

import { anonymizeChat, type ParsedChat } from './chat-parse';

// 내 말투 학습용 표본 만들기. 대화 파일 전체가 아니라 이름을 가린 최근 줄만, 소음을 빼고 짧게 잘라 보낸다.
// 순수 함수라 vitest로 테스트한다. 파일 원문은 이 함수를 거친 뒤 화면 메모리에서도 지운다.

/** 카톡이 넣는 자동 문구 · 첨부 알림. 말투가 아니라서 뺀다 */
const NOISE_BODY =
  /^(?:사진(?: \d+장)?|동영상|이모티콘|\(이모티콘\)|음성메시지|삭제된 메시지입니다\.?|파일: .+|보이스톡.*|페이스톡.*|https?:\/\/\S+|샵검색: .*)$/;

export const STYLE_SAMPLE_MAX_LINES = 150;
const MAX_CHARS = 200;
/** 이보다 적으면 말투를 판단하기 어렵다 */
export const STYLE_MIN_MINE = 5;

export function buildStyleSample(
  parsed: ParsedChat,
  me: string,
  partnerLabel: string,
): { lines: ChatLine[]; mine: number; theirs: number } {
  const lines = anonymizeChat(parsed, me, partnerLabel)
    .map((l) => ({
      ...l,
      text: l.text
        .split('\n')
        .filter((row) => !NOISE_BODY.test(row.trim()))
        .join('\n')
        .trim()
        .slice(0, MAX_CHARS),
    }))
    .filter((l) => l.text.length > 0)
    .slice(-STYLE_SAMPLE_MAX_LINES);
  const mine = lines.filter((l) => l.speaker === 'me').length;
  return { lines, mine, theirs: lines.length - mine };
}

/** 파일이 커도 화면이 버벅이지 않게 최근 줄만 남긴다 (표본은 어차피 최근 150줄) */
export function keepRecentRows(text: string, maxRows = 3000): string {
  const rows = text.replace(/\r\n?/g, '\n').split('\n');
  return rows.length > maxRows ? rows.slice(-maxRows).join('\n') : rows.join('\n');
}
