// 한국어 조사 붙이기. 닉네임 끝 글자의 받침에 따라 이/가, 와/과, 을/를 등을 고른다.

function hasBatchim(word: string): boolean {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false; // 한글이 아니면 받침 없음으로 본다
  return (last - 0xac00) % 28 !== 0;
}

/** 코코 → 코코가, 민준 → 민준이 */
export const withIGa = (w: string) => w + (hasBatchim(w) ? '이' : '가');
/** 코코 → 코코와, 민준 → 민준과 */
export const withWaGwa = (w: string) => w + (hasBatchim(w) ? '과' : '와');
/** 코코 → 코코를, 민준 → 민준을 */
export const withEulReul = (w: string) => w + (hasBatchim(w) ? '을' : '를');
