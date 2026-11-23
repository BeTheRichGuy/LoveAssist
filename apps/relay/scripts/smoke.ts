import type {
  AnalyzeRequest,
  ChatLine,
  InstallResponse,
  PartnerContext,
  ScoreRequest,
  SimulateRequest,
} from '@loveassist/shared';

// 중계 서버 동작 확인: 설치 등록 → 감정소 · 시뮬레이션 · 채점을 한 번씩 부른다 (가상 대화).
// 사용: npm run relay:smoke url=https://<배포 주소> invite=<초대 코드>
//       (로컬: npm run relay 를 켠 상태에서 url=http://localhost:8787)

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=', 2)));
const url = (args.url ?? 'http://localhost:8787').replace(/\/$/, '');
const invite = args.invite;
if (!invite) throw new Error('invite=<초대 코드> 를 주세요');

const partner: PartnerContext = {
  label: '지우',
  stage: 'some',
  traits: ['답장이 느린 편'],
  memos: ['전시 좋아함'],
};
const lines: ChatLine[] = [
  { speaker: 'me', text: '이번 주말에 뭐 해?' },
  { speaker: 'partner', text: '전시 가고 싶은데 사람 많을 것 같아서 고민 중ㅠ' },
];

async function call(path: string, body: unknown, token?: string) {
  const started = Date.now();
  const res = await fetch(url + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(`${path}  ${res.status}  ${((Date.now() - started) / 1000).toFixed(1)}초`);
  if (!res.ok) throw new Error(`${path} 실패: ${JSON.stringify(json)}`);
  return json;
}

const { token } = (await call('/v1/install', { inviteCode: invite })) as InstallResponse;

const analyze = await call(
  '/v1/analyze',
  { lines: [...lines], partner, mode: 'normal' } satisfies AnalyzeRequest,
  token,
);
console.log('  ', JSON.stringify(analyze).slice(0, 200), '…');

const simulate = await call(
  '/v1/simulate',
  {
    partner,
    history: [...lines, { speaker: 'me', text: '평일 저녁에 갈래?' }],
  } satisfies SimulateRequest,
  token,
);
console.log('  ', JSON.stringify(simulate));

const score = await call(
  '/v1/score',
  {
    partner,
    history: [...lines],
    draft: '그럼 평일 저녁에 한적할 때 갈래?',
  } satisfies ScoreRequest,
  token,
);
console.log('  ', JSON.stringify(score));

const noToken = await fetch(url + '/v1/score', { method: 'POST', body: '{}' });
console.log(`토큰 없이 요청 → ${noToken.status} (401이어야 정상)`);
