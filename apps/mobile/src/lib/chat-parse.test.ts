import { describe, expect, it } from 'vitest';

import {
  anonymizeChat,
  MAX_LINE_CHARS,
  MAX_SEND_LINES,
  parseChat,
  trimForSend,
} from './chat-parse';

describe('parseChat', () => {
  it('카톡 복사 형식에서 화자와 본문을 나눈다', () => {
    const parsed = parseChat(
      [
        '[김다은] [오후 9:12] 오늘 좀 피곤하네…',
        '[김다은] [오후 9:12] 너는 뭐해?',
        '[이도윤] [오후 9:15] 나 집이야',
      ].join('\n'),
    );
    expect(parsed.speakers).toEqual(['김다은', '이도윤']);
    expect(parsed.lines).toEqual([
      { speaker: '김다은', text: '오늘 좀 피곤하네…' },
      { speaker: '김다은', text: '너는 뭐해?' },
      { speaker: '이도윤', text: '나 집이야' },
    ]);
  });

  it('대화 내보내기 형식과 날짜 구분선을 처리한다', () => {
    const parsed = parseChat(
      [
        '--------------- 2026년 10월 11일 토요일 ---------------',
        '2026년 10월 11일 오후 9:12, 김다은 : 주말에 뭐 해?',
        '2026년 10월 11일 오후 9:13, 이도윤 : 아직 몰라',
      ].join('\n'),
    );
    expect(parsed.speakers).toEqual(['김다은', '이도윤']);
    expect(parsed.lines).toHaveLength(2);
  });

  it('화자 없이 이어지는 줄은 앞 메시지에 붙인다', () => {
    const parsed = parseChat('[김다은] [오후 9:12] 첫 줄\n둘째 줄');
    expect(parsed.lines).toEqual([{ speaker: '김다은', text: '첫 줄\n둘째 줄' }]);
  });

  it('형식 없는 텍스트는 화자 없음으로 둔다', () => {
    const parsed = parseChat('오늘 좀 피곤하네… 너는 뭐해?');
    expect(parsed.speakers).toEqual([]);
    expect(parsed.lines).toEqual([{ speaker: null, text: '오늘 좀 피곤하네… 너는 뭐해?' }]);
  });

  it('콜론이 한 줄에만 있으면 화자로 보지 않는다', () => {
    const parsed = parseChat('시간: 저녁 7시에 보자');
    expect(parsed.speakers).toEqual([]);
  });

  it('"이름: 말" 형식이 여러 줄이면 화자로 본다', () => {
    const parsed = parseChat('다은: 뭐해?\n나: 집이야');
    expect(parsed.speakers).toEqual(['다은', '나']);
  });
});

describe('anonymizeChat', () => {
  const parsed = parseChat(
    [
      '[김다은] [오후 9:12] 도윤야 오늘 피곤하네',
      '[이도윤] [오후 9:15] 다은아 고생했어',
      '[김다은] [오후 9:16] 김다은 피곤해',
    ].join('\n'),
  );

  it('화자를 me/partner로 바꾸고 본문의 실명을 치환한다', () => {
    const lines = anonymizeChat(parsed, '이도윤', '상대');
    expect(lines).toEqual([
      { speaker: 'partner', text: '(나)야 오늘 피곤하네' },
      { speaker: 'me', text: '(상대)아 고생했어' },
      { speaker: 'partner', text: '(상대) 피곤해' },
    ]);
  });

  it('닉네임이 있으면 닉네임으로 치환한다', () => {
    const lines = anonymizeChat(parsed, '이도윤', '코코');
    expect(lines.map((l) => l.text)).not.toContain('다은');
    expect(lines[2]?.text).toBe('코코 피곤해');
  });

  it('치환 후 실명이 남지 않는다', () => {
    const text = anonymizeChat(parsed, '이도윤', '상대')
      .map((l) => l.text)
      .join(' ');
    for (const name of ['김다은', '다은', '이도윤', '도윤']) expect(text).not.toContain(name);
  });

  it('화자 없는 줄은 상대 메시지로 본다', () => {
    expect(anonymizeChat(parseChat('너는 뭐해?'), null, '상대')).toEqual([
      { speaker: 'partner', text: '너는 뭐해?' },
    ]);
  });
});

describe('trimForSend', () => {
  const line = (i: number) => ({ speaker: 'partner' as const, text: `메시지 ${i}` });

  it('최근 메시지만 남기고 뺀 줄 수를 알려 준다 (서버는 100줄까지만 받는다)', () => {
    const lines = Array.from({ length: MAX_SEND_LINES + 30 }, (_, i) => line(i));
    const trimmed = trimForSend(lines);
    expect(trimmed.omitted).toBe(30);
    expect(trimmed.lines).toHaveLength(MAX_SEND_LINES);
    expect(trimmed.lines.at(-1)).toEqual(line(MAX_SEND_LINES + 29));
  });

  it('너무 긴 한 줄은 뒷부분을 자른다 (서버는 한 줄 1000자까지만 받는다)', () => {
    const { lines } = trimForSend([{ speaker: 'me', text: '가'.repeat(MAX_LINE_CHARS + 50) }]);
    expect(lines[0]!.text).toHaveLength(MAX_LINE_CHARS);
  });

  it('짧은 대화는 그대로 둔다', () => {
    const lines = [line(1), line(2)];
    expect(trimForSend(lines)).toEqual({ lines, omitted: 0 });
  });
  it('받침 있는 이름 뒤 애칭 "이"는 이름과 같이 바꾼다', () => {
    const p = parseChat(
      '[김다은] [오후 9:12] 뭐해\n[이도윤] [오후 9:13] 다은이는? 다은이가 그랬어',
    );
    expect(anonymizeChat(p, '이도윤', '코코')[1]?.text).toBe('코코는? 코코가 그랬어');
  });

  it('카톡 대화 본문 속 "항목 : 값" 줄을 화자로 보지 않는다 (단톡방 오인 방지)', () => {
    const raw = [
      '대기 23 이진우 님과 카카오톡 대화',
      '저장한 날짜 : 2026-10-14 19:46:22',
      '--------------- 2026년 10월 1일 수요일 ---------------',
      '[대기 23 이진우] [오후 3:12] 정산할게',
      '결제금액 : 52,000원',
      '인원 : 2명',
      '- 1인(2명) : 26,000원',
      '[김민수] [오후 3:13] 고마워',
      '[김민수] [오후 3:13] 보낼게 : )',
    ].join('\n');
    const parsed = parseChat(raw);
    expect(parsed.speakers).toEqual(['대기 23 이진우', '김민수']);
    expect(parsed.lines[0]!.text).toBe(
      ['정산할게', '결제금액 : 52,000원', '인원 : 2명', '- 1인(2명) : 26,000원'].join('\n'),
    );
  });
});
