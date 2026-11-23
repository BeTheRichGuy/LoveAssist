import type { ChatLine } from '@loveassist/shared';

// 붙여넣은 카톡 대화를 줄 단위로 나누고, 실명을 "나" / 상대 닉네임으로 치환한다.
// 모두 기기 안에서만 처리한다. 원문과 실명은 서버로 보내지 않는다.

export type ParsedLine = { speaker: string | null; text: string };
export type ParsedChat = { speakers: string[]; lines: ParsedLine[] };

// 카톡 모바일·PC에서 여러 메시지 복사: [홍길동] [오후 3:12] 메시지
const BRACKET = /^\[(.+?)\] \[(?:오전|오후) \d{1,2}:\d{2}\] ?(.*)$/;
// 모바일 대화 내보내기: 2024년 1월 2일 오후 3:12, 홍길동 : 메시지
const EXPORT = /^\d{4}년 \d{1,2}월 \d{1,2}일 (?:오전|오후) \d{1,2}:\d{2}, (.+?) : (.*)$/;
// 아이폰 대화 내보내기: 2024. 1. 2. 오후 3:12, 홍길동 : 메시지
const EXPORT_DOT = /^\d{4}\. \d{1,2}\. \d{1,2}\.? (?:오전|오후) \d{1,2}:\d{2}, (.+?) : (.*)$/;
// 직접 쓴 형식: 홍길동: 메시지 (이름 끝에 공백이 오는 "결제금액 : 5원" 같은 줄은 제외)
const COLON = /^([^\s:[\]](?:[^:[\]]{0,18}[^\s:[\]])?): (.+)$/;
// 날짜 구분선, 내보내기 머리말 등 대화가 아닌 줄
const NOISE = [
  /^-{3,}.*-{3,}$/,
  /^\d{4}년 \d{1,2}월 \d{1,2}일 [월화수목금토일]요일$/,
  /^\d{4}년 \d{1,2}월 \d{1,2}일 (?:오전|오후) \d{1,2}:\d{2}$/,
  /^\d{4}\. \d{1,2}\. \d{1,2}\.? (?:오전|오후) \d{1,2}:\d{2}$/,
  /^\d{4}\. \d{1,2}\. \d{1,2}\.? [월화수목금토일]요일$/,
  /님과 카카오톡 대화$/,
  /^저장한 날짜 : /,
];

function matchSpeaker(line: string, allowColon: boolean): { speaker: string; text: string } | null {
  const patterns = [BRACKET, EXPORT, EXPORT_DOT];
  for (const pattern of allowColon ? [...patterns, COLON] : patterns) {
    const m = pattern.exec(line);
    if (m?.[1] && m[2] !== undefined) return { speaker: m[1].trim(), text: m[2].trim() };
  }
  return null;
}

export function parseChat(raw: string): ParsedChat {
  const rows = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOISE.some((n) => n.test(l)));

  // "이름: 말" 형식은 우연히 들어맞기 쉬워서, 카톡 형식([이름] [시간] · 내보내기) 줄이 하나도 없고
  // 두 줄 이상이 그 형식일 때만 화자로 본다 (카톡 대화 본문 속 "금액 : 5원" 같은 줄을 화자로 오인하지 않게)
  const kakao = rows.some((l) => BRACKET.test(l) || EXPORT.test(l) || EXPORT_DOT.test(l));
  const colonHits = rows.filter((l) => COLON.test(l)).length;
  const allowColon = !kakao && colonHits >= 2;

  const lines: ParsedLine[] = [];
  for (const row of rows) {
    const hit = matchSpeaker(row, allowColon);
    const last = lines[lines.length - 1];
    if (hit) {
      lines.push({ speaker: hit.speaker, text: hit.text });
    } else if (last && last.speaker !== null) {
      // 화자 표시 없이 이어지는 줄은 앞 메시지의 여러 줄 본문
      last.text = last.text ? `${last.text}\n${row}` : row;
    } else {
      lines.push({ speaker: null, text: row });
    }
  }

  const speakers = [...new Set(lines.flatMap((l) => (l.speaker ? [l.speaker] : [])))];
  return { speakers, lines: lines.filter((l) => l.text.length > 0) };
}

/** 이름이 본문에 불릴 때의 변형. 세 글자 이름은 성을 뺀 부르는 이름도 찾는다 (홍길동 → 길동) */
function nameVariants(name: string): string[] {
  const variants = [name];
  if (/^[가-힣]{3}$/.test(name)) variants.push(name.slice(1));
  return variants;
}

/** 애칭 "이" 뒤에 오는 조사 · 끝. 이 경우만 "이"를 이름의 일부로 본다 */
const AFFIX_FOLLOW = '(?=$|[^가-힣]|(?:는|가|랑|도|를|의|한테|에게|야)(?![가-힣]))';

function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 본문 속 이름 자리에 넣는 표시. "준호야" → "(나)야"처럼 부르는 말이라는 게 드러나게 괄호를 쓴다 */
const ME_TOKEN = '(나)';
const PARTNER_TOKEN = '(상대)';

/** AI로 보내는 최대 줄 수. 판독은 최근 대화가 중요하고, 덜 보낼수록 좋다 (서버 한도는 100줄) */
export const MAX_SEND_LINES = 50;
/** 한 줄 최대 글자 수 (서버 한도와 같다) */
export const MAX_LINE_CHARS = 1000;

/** 서버 한도에 맞게 최근 줄만 남기고 너무 긴 줄은 자른다. 뺀 줄 수는 화면에 안내한다 */
export function trimForSend(lines: ChatLine[]): { lines: ChatLine[]; omitted: number } {
  const recent = lines.slice(-MAX_SEND_LINES);
  return {
    lines: recent.map((l) =>
      l.text.length > MAX_LINE_CHARS ? { ...l, text: l.text.slice(0, MAX_LINE_CHARS) } : l,
    ),
    omitted: lines.length - recent.length,
  };
}

/**
 * 화자를 me/partner로 바꾸고, 본문에 나오는 실명도 치환한다.
 * - me: 사용자가 "나"라고 고른 화자. 본문에서는 "(나)"로 바꾼다
 *   ("준호야 끝났어?"를 "나야 끝났어?"로 바꾸면 "나야"(=It's me)로 뜻이 바뀌기 때문)
 * - 그 외 화자: 상대. 본문에서는 닉네임으로, 닉네임이 아직 없으면 "(상대)"로 바꾼다
 * - 화자 표시가 없는 줄은 상대가 보낸 메시지로 본다 (상대 메시지만 붙여넣는 경우가 많다)
 */
export function anonymizeChat(
  parsed: ParsedChat,
  me: string | null,
  partnerLabel: string,
): ChatLine[] {
  const partnerToken = partnerLabel === '상대' ? PARTNER_TOKEN : partnerLabel;
  const replacements = parsed.speakers
    .flatMap((s) =>
      nameVariants(s).map((v) => ({ from: v, to: s === me ? ME_TOKEN : partnerToken })),
    )
    .sort((a, b) => b.from.length - a.from.length);

  // 이름은 어디에 있든 모두 바꾼다 (낱말 속이어도: 가리는 쪽이 안전하다).
  // 받침 있는 이름 뒤에 붙는 애칭 "이"(하늘이는 · 하늘이가)는 이름과 같이 바꿔 "코코이는"이 되지 않게 한다
  const mask = (text: string) =>
    replacements.reduce((acc, { from, to }) => {
      const affix = hasBatchim(from) ? `(?:이${AFFIX_FOLLOW})?` : '';
      return acc.replace(new RegExp(escapeRegExp(from) + affix, 'g'), to);
    }, text);

  return parsed.lines.map((l) => ({
    speaker: l.speaker !== null && l.speaker === me ? 'me' : 'partner',
    text: mask(l.text),
  }));
}
