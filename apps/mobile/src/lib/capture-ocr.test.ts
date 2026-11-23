import { describe, expect, it } from 'vitest';

import { ocrToChat, type OcrLine } from './capture-ocr';

const W = 1080;
const H = 2340;
const line = (text: string, left: number, top: number, width: number, height = 40): OcrLine => ({
  text,
  left,
  top,
  width,
  height,
});

/** 카톡 대화방 캡처 한 장을 흉내 낸 OCR 결과 (상대 왼쪽 · 나 오른쪽) */
const SCREEN: OcrLine[] = [
  line('오후 9:41', 40, 20, 120, 30), // 상태 표시줄
  line('87%', 940, 20, 80, 30),
  line('김다은', 200, 130, 160, 44), // 대화방 제목
  line('2026년 10월 13일 월요일', 340, 300, 400, 30), // 날짜 구분선 (가운데)
  line('김다은', 170, 380, 110, 30), // 상대 이름표 (작은 글씨)
  line('오늘 좀 피곤하네', 180, 420, 400), // 상대 말풍선
  line('오후 9:12', 600, 455, 110, 26), // 시간
  line('다은이는 오늘 일찍 잘래', 180, 520, 520), // 상대 말풍선 2 (본문 속 이름)
  line('1', 590, 640, 20, 26), // 읽지 않음
  line('웅 고생했어ㅋㅋ', 640, 620, 380), // 내 말풍선 1줄째
  line('얼른 쉬어', 640, 665, 200), // 같은 말풍선 2줄째
  line('그럼 내일 보자', 700, 780, 320), // 내 말풍선 2
  line('메시지 입력', 120, 2200, 300, 36), // 입력창
];

describe('캡처 OCR → 대화', () => {
  it('상태 표시줄 · 제목 · 시간 · 읽음 · 날짜 · 입력창을 빼고 말풍선 위치로 화자를 나눈다', () => {
    const { lines } = ocrToChat({ width: W, height: H, lines: SCREEN }, '코코');
    expect(lines).toEqual([
      { speaker: 'partner', text: '오늘 좀 피곤하네' },
      { speaker: 'partner', text: '코코는 오늘 일찍 잘래' },
      { speaker: 'me', text: '웅 고생했어ㅋㅋ 얼른 쉬어' },
      { speaker: 'me', text: '그럼 내일 보자' },
    ]);
  });

  it('대화방 제목과 이름표를 상대 이름으로 보고, 보내는 내용에 실명이 남지 않는다', () => {
    const { lines, names } = ocrToChat({ width: W, height: H, lines: SCREEN }, '상대');
    expect(names).toEqual(['김다은']);
    const text = JSON.stringify(lines);
    for (const n of ['김다은', '다은']) expect(text).not.toContain(n);
  });

  it('이름표 없이 잘린 캡처도 위치로 화자를 나눈다', () => {
    const cropped = [line('주말에 뭐해?', 180, 400, 360), line('아직 몰라ㅋㅋ', 700, 520, 320)];
    expect(ocrToChat({ width: W, height: H, lines: cropped }, '상대').lines).toEqual([
      { speaker: 'partner', text: '주말에 뭐해?' },
      { speaker: 'me', text: '아직 몰라ㅋㅋ' },
    ]);
  });

  it('말풍선 끝에 붙어 읽힌 시간은 지운다', () => {
    const r = ocrToChat(
      { width: W, height: H, lines: [line('밥 먹었어? 오후 9:12', 180, 400, 500)] },
      '상대',
    );
    expect(r.lines).toEqual([{ speaker: 'partner', text: '밥 먹었어?' }]);
  });

  it('짧은 상대 메시지(ㅋㅋ)는 이름표로 잘못 빼지 않는다', () => {
    const r = ocrToChat(
      { width: W, height: H, lines: [line('ㅋㅋ', 180, 400, 80), line('진짜?', 180, 450, 120)] },
      '상대',
    );
    expect(r.lines.map((l) => l.text)).toEqual(['ㅋㅋ 진짜?']);
  });
});
