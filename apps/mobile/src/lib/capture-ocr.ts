import type { ChatLine } from '@loveassist/shared';

import { anonymizeChat } from './chat-parse';

// 카톡 캡처 OCR 결과(줄마다 글자 + 위치)를 대화로 바꾼다. 순수 함수라 vitest로 테스트한다.
// - 위쪽 상태 표시줄 · 대화방 제목, 아래쪽 입력창, 시간 · 읽음 숫자 · 날짜 구분선을 뺀다
// - 말풍선이 화면 왼쪽에 붙어 있으면 상대, 오른쪽에 붙어 있으면 나
// - 대화방 제목과 상대 말풍선 위의 작은 이름표는 상대 이름으로 보고 빼고, 본문 속 이름도 가린다
// - 같은 말풍선 안에서 줄바꿈된 줄은 하나로 합친다
// 완벽하지 않으므로 화면에서 사용자가 화자 · 내용을 고치고 지운 뒤 보낸다.

export interface OcrLine {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface OcrResult {
  width: number;
  height: number;
  lines: OcrLine[];
}

/** 화면 위쪽 이 비율 안은 상태 표시줄 · 대화방 제목 영역 */
const HEADER_RATIO = 0.12;
/** 화면 아래쪽 이 비율 밖은 입력창 영역 */
const FOOTER_RATIO = 0.93;

const STATUS = /^(?:(?:오전|오후)\s?)?\d{1,2}:\d{2}(?:\s?(?:AM|PM))?$|%|^(?:LTE|5G|4G|Wi-?Fi)$/i;
const NOISE = [
  /^(?:오전|오후)\s?\d{1,2}:\d{2}$/, // 시간
  /^\d{1,3}$/, // 읽지 않은 사람 수
  /^\d{4}년 \d{1,2}월 \d{1,2}일/, // 날짜 구분선
  /^\d{4}\. ?\d{1,2}\. ?\d{1,2}/,
  /^[<>+#≡QㅁO○●·•\-|=]{1,2}$/, // 아이콘이 글자로 읽힌 것
  /^메시지\s?입력/,
  /님이 (?:들어왔|나갔)습니다/,
  /^여기까지 읽었습니다$/,
];
const TRAILING_TIME = /\s(?:오전|오후)\s?\d{1,2}:\d{2}$/;

/** anonymizeChat에 "나"를 알려 주는 자리표시 (캡처에는 내 이름이 안 보인다) */
const ME = '@@me@@';

type Side = 'me' | 'partner' | 'center';

function sideOf(l: OcrLine, w: number): Side {
  const leftGap = l.left / w;
  const rightGap = (w - (l.left + l.width)) / w;
  // 양쪽 여백이 비슷하고 둘 다 넓으면 가운데 정렬된 안내 줄 (날짜 · 입장 알림 등)
  if (Math.abs(leftGap - rightGap) < 0.08 && leftGap > 0.15 && rightGap > 0.15) return 'center';
  return leftGap < rightGap ? 'partner' : 'me';
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};

/** 이름처럼 보이는 짧은 글 (이름표 · 대화방 제목) */
const looksLikeName = (t: string) => /^[가-힣A-Za-z][가-힣A-Za-z0-9 ._]{0,11}$/.test(t);

export function ocrToChat(
  ocr: OcrResult,
  partnerLabel: string,
): { lines: ChatLine[]; names: string[] } {
  const { width: w, height: h } = ocr;
  const names = new Set<string>();
  const sorted = [...ocr.lines]
    .map((l) => ({ ...l, text: l.text.trim().replace(TRAILING_TIME, '') }))
    .filter((l) => l.text.length > 0)
    .sort((a, b) => a.top - b.top || a.left - b.left);

  const body: (OcrLine & { side: Side })[] = [];
  for (const l of sorted) {
    if (l.top + l.height < h * HEADER_RATIO) {
      // 위쪽: 상태 표시줄은 버리고, 남는 짧은 글은 대화방 제목(= 상대 이름)으로 본다
      const t = l.text.replace(/\s?\d+$/, ''); // 단톡 인원 수
      if (!STATUS.test(l.text) && looksLikeName(t)) names.add(t);
      continue;
    }
    if (l.top > h * FOOTER_RATIO) continue;
    if (NOISE.some((n) => n.test(l.text))) continue;
    const side = sideOf(l, w);
    if (side === 'center') continue;
    body.push({ ...l, side });
  }

  // 상대 말풍선 위 이름표: 상대 쪽 짧은 줄인데 글자가 말풍선 글보다 작고, 바로 아래 상대 줄이 있다
  const textHeight = median(body.map((l) => l.height));
  const isNameLabel = (l: (typeof body)[number], next: (typeof body)[number] | undefined) =>
    l.side === 'partner' &&
    (names.has(l.text) ||
      (looksLikeName(l.text) &&
        l.height < textHeight * 0.82 &&
        next?.side === 'partner' &&
        next.top - (l.top + l.height) < l.height * 2));

  const kept: (typeof body)[number][] = [];
  body.forEach((l, i) => {
    if (isNameLabel(l, body[i + 1])) names.add(l.text);
    else kept.push(l);
  });

  // 같은 말풍선의 줄 합치기: 같은 쪽이고, 위 줄 바로 아래(줄 높이 절반 안쪽)에서 같은 왼쪽 위치로 시작
  const messages: { speaker: 'me' | 'partner'; text: string }[] = [];
  let prev: (typeof kept)[number] | null = null;
  for (const l of kept) {
    const last = messages[messages.length - 1];
    const sameBubble =
      prev !== null &&
      last !== undefined &&
      prev.side === l.side &&
      l.top - (prev.top + prev.height) < prev.height * 0.5 &&
      Math.abs(l.left - prev.left) < w * 0.04;
    if (sameBubble) last.text = `${last.text} ${l.text}`;
    else messages.push({ speaker: l.side === 'me' ? 'me' : 'partner', text: l.text });
    prev = l;
  }

  // 이름 가리기는 붙여넣기와 같은 규칙을 쓴다 (본문 속 이름 · 애칭 "이"까지)
  const nameList = [...names];
  const masked = anonymizeChat(
    {
      speakers: nameList,
      lines: messages.map((m) => ({
        speaker: m.speaker === 'me' ? ME : (nameList[0] ?? null),
        text: m.text,
      })),
    },
    ME,
    partnerLabel,
  );
  return { lines: masked, names: nameList };
}
