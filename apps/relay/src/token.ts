// 설치별 익명 토큰: "<설치 ID>.<서명>". 서버는 토큰을 저장하지 않고 서명만 확인한다.
// 서명 키(TOKEN_SECRET)를 바꾸면 기존 토큰은 모두 무효가 된다.

const encoder = new TextEncoder();

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
  return btoa(String.fromCharCode(...mac))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function issueToken(secret: string): Promise<string> {
  const installId = crypto.randomUUID();
  return `${installId}.${await sign(secret, installId)}`;
}

/** 서명이 맞으면 설치 ID, 아니면 null */
export async function verifyToken(secret: string, token: string): Promise<string | null> {
  const [installId, mac, extra] = token.split('.');
  if (!installId || !mac || extra !== undefined) return null;
  const expected = await sign(secret, installId);
  // 길이가 같을 때 모든 글자를 비교해 시간 차로 서명을 추측하지 못하게 한다
  if (expected.length !== mac.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? installId : null;
}
