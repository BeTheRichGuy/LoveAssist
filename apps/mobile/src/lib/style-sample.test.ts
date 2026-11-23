import { describe, expect, it } from 'vitest';

import { parseChat } from './chat-parse';
import { buildStyleSample, keepRecentRows, STYLE_SAMPLE_MAX_LINES } from './style-sample';

const ANDROID = [
  '김다은 님과 카카오톡 대화',
  '저장한 날짜 : 2026-10-14 21:00:00',
  '',
  '2026년 10월 13일 오후 9:10, 김다은 : 도윤야 뭐해',
  '2026년 10월 13일 오후 9:11, 이도윤 : 웅 집이야ㅋㅋ',
  '2026년 10월 13일 오후 9:11, 이도윤 : 사진',
  '2026년 10월 13일 오후 9:12, 김다은 : 이모티콘',
  '2026년 10월 13일 오후 9:12, 이도윤 : https://example.com/x',
  '2026년 10월 13일 오후 9:13, 이도윤 : 다은이는?',
].join('\n');

describe('말투 표본', () => {
  it('안드로이드 내보내기 파일에서 화자를 나누고 첨부 알림 · 링크를 뺀다', () => {
    const parsed = parseChat(ANDROID);
    expect(parsed.speakers).toEqual(['김다은', '이도윤']);
    const s = buildStyleSample(parsed, '이도윤', '코코');
    expect(s.lines).toEqual([
      { speaker: 'partner', text: '(나)야 뭐해' },
      { speaker: 'me', text: '웅 집이야ㅋㅋ' },
      { speaker: 'me', text: '코코는?' },
    ]);
    expect(s).toMatchObject({ mine: 2, theirs: 1 });
  });

  it('아이폰 내보내기 형식도 읽는다', () => {
    const parsed = parseChat(
      [
        '2026. 10. 13. 오후 9:10, 김다은 : 뭐해?',
        '2026. 10. 13. 오후 9:11, 이도윤 : 그냥 있어',
      ].join('\n'),
    );
    expect(parsed.speakers).toEqual(['김다은', '이도윤']);
    expect(parsed.lines).toHaveLength(2);
  });

  it('보내는 표본에 실명이 남지 않는다', () => {
    const text = JSON.stringify(buildStyleSample(parseChat(ANDROID), '이도윤', '코코'));
    for (const name of ['김다은', '다은', '이도윤', '도윤']) expect(text).not.toContain(name);
  });

  it('최근 150줄 · 줄당 200자까지만 보낸다', () => {
    const rows = Array.from(
      { length: 400 },
      (_, i) => `2026년 10월 13일 오후 9:10, ${i % 2 ? '나나' : '상대'} : ${'가'.repeat(300)}${i}`,
    );
    const s = buildStyleSample(parseChat(rows.join('\n')), '나나', '상대');
    expect(s.lines).toHaveLength(STYLE_SAMPLE_MAX_LINES);
    expect(Math.max(...s.lines.map((l) => l.text.length))).toBe(200);
  });

  it('큰 파일은 최근 줄만 남긴다', () => {
    const big = Array.from({ length: 5000 }, (_, i) => `줄${i}`).join('\n');
    const kept = keepRecentRows(big).split('\n');
    expect(kept).toHaveLength(3000);
    expect(kept.at(-1)).toBe('줄4999');
  });
});
