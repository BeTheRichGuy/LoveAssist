// 공유 카드에서 닉네임을 "상대"로 가린다. 닉네임이 다른 낱말 속에 들어 있을 수 있어
// (닉네임 "별" → "별로", "특별한") 이름으로 쓰인 경우만 바꾼다:
// 앞에 한글이 없고, 뒤가 끝 · 한글 아닌 글자 · 조사일 때.
// 이름에 붙는 "이 · 아 · 야"(별이, 별아, 코코야)는 이름과 같이 가린다. 받침 있는 이름만 "이 · 아",
// 받침 없는 이름은 "야"를 붙이므로 "코코아"는 이름으로 보지 않는다.
const JOSA = '(?:이랑|한테|에게|께서|가|는|은|을|를|랑|도|와|과|의|님|씨)';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

export function maskName(text: string, name: string, replacement = '상대'): string {
  const suffix = hasBatchim(name) ? '(?:이|아)' : '야';
  const pattern = new RegExp(
    `(?<![가-힣])${escapeRegExp(name)}${suffix}?(?=$|[^가-힣]|${JOSA}(?![가-힣]))`,
    'g',
  );
  return text.replace(pattern, replacement);
}
