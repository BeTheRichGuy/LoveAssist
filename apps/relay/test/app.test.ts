import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalyzeResult, ReplyScore, ScoreRequest } from '@loveassist/shared';
import { createApp, failureKind, type CallLlm, type Env } from '../src/app';
import { verifyToken } from '../src/token';

const allow = { limit: async () => ({ success: true }) };
const deny = { limit: async () => ({ success: false }) };

/** Durable Object 대신 메모리로 세는 가짜 하루 사용량 저장소 (설치 ID별) */
function fakeUsage() {
  const counts = new Map<string, number>();
  return {
    idFromName: (name: string) => name,
    get: (id: string) => ({
      consume: async (feature: string, limit: number) => {
        const key = `${id}:${feature}`;
        const used = counts.get(key) ?? 0;
        if (used >= limit) return { ok: false, used };
        counts.set(key, used + 1);
        return { ok: true, used: used + 1 };
      },
    }),
  };
}

function env(over: Partial<Env> & Record<string, unknown> = {}): Env {
  return {
    ANTHROPIC_API_KEY: 'test',
    TOKEN_SECRET: 'secret',
    INVITE_CODE: 'invite',
    RL_INSTALL: allow,
    RL_ANALYZE: allow,
    RL_SIMULATE: allow,
    RL_SCORE: allow,
    RL_STYLE: allow,
    USAGE: fakeUsage(),
    ...over,
  } as unknown as Env;
}

const SCORE: ReplyScore = {
  total: 80,
  axes: { empathy: 80, fit: 80, tone: 80, tempo: 80 },
  tip: '좋아요',
  suggestion: null,
};
const okLlm: CallLlm = async () => ({
  ok: true,
  data: SCORE,
  usage: { inputTokens: 100, outputTokens: 20 },
});

const scoreReq: ScoreRequest = {
  partner: { label: '지우', stage: 'some', traits: [], memos: [] },
  history: [{ speaker: 'partner', text: '오늘 야근했어' }],
  draft: '고생했어 밥은 먹었어?',
};

const post = (path: string, body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

async function install(app: ReturnType<typeof createApp>, e = env()) {
  const res = await app.request('/v1/install', post('/v1/install', { inviteCode: 'invite' }), e);
  return ((await res.json()) as { token: string }).token;
}

afterEach(() => vi.restoreAllMocks());

describe('POST /v1/install', () => {
  it('초대 코드가 맞으면 서명된 토큰을 준다', async () => {
    const token = await install(createApp(okLlm));
    expect(await verifyToken('secret', token)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('초대 코드가 틀리면 401', async () => {
    const res = await createApp(okLlm).request(
      '/v1/install',
      post('/v1/install', { inviteCode: 'nope' }),
      env(),
    );
    expect(res.status).toBe(401);
  });

  it('IP별 등록 한도를 넘으면 429', async () => {
    const res = await createApp(okLlm).request(
      '/v1/install',
      post('/v1/install', { inviteCode: 'invite' }),
      env({ RL_INSTALL: deny as RateLimit }),
    );
    expect(res.status).toBe(429);
  });
});

describe('AI 엔드포인트', () => {
  it('토큰이 없거나 위조되면 401', async () => {
    const app = createApp(okLlm);
    const token = await install(app);
    const forged = token.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    const cases: Record<string, string>[] = [{}, { authorization: `Bearer ${forged}` }];
    for (const headers of cases) {
      const res = await app.request('/v1/score', post('/v1/score', scoreReq, headers), env());
      expect(res.status).toBe(401);
    }
  });

  it('요청 형식이 틀리면 LLM을 부르지 않고 400', async () => {
    const llm = vi.fn(okLlm);
    const app = createApp(llm);
    const auth = { authorization: `Bearer ${await install(app)}` };
    const res = await app.request('/v1/score', post('/v1/score', { draft: '' }, auth), env());
    expect(res.status).toBe(400);
    expect(llm).not.toHaveBeenCalled();
  });

  it('채점은 생각 끈 Haiku로 부르고 결과를 그대로 돌려준다', async () => {
    const llm = vi.fn(okLlm);
    const app = createApp(llm);
    const auth = { authorization: `Bearer ${await install(app)}` };
    const res = await app.request('/v1/score', post('/v1/score', scoreReq, auth), env());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SCORE);
    expect(llm.mock.calls[0]![1]).toMatchObject({ model: 'claude-haiku-5-5', noThinking: true });
  });

  it('설치별 한도를 넘으면 429', async () => {
    const app = createApp(okLlm);
    const auth = { authorization: `Bearer ${await install(app)}` };
    const res = await app.request(
      '/v1/score',
      post('/v1/score', scoreReq, auth),
      env({ RL_SCORE: deny as RateLimit }),
    );
    expect(res.status).toBe(429);
  });

  it('하루 한도를 넘으면 daily_limit 429이고 AI를 부르지 않는다', async () => {
    const llm = vi.fn(okLlm);
    const app = createApp(llm);
    const e = env({ DAILY_LIMIT_SCORE: '2' });
    const auth = { authorization: `Bearer ${await install(app, e)}` };
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/v1/score', post('/v1/score', scoreReq, auth), e);
      statuses.push(res.status);
      if (res.status === 429) expect(await res.json()).toEqual({ error: 'daily_limit' });
    }
    expect(statuses).toEqual([200, 200, 429]);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('하루 한도는 설치마다 따로 센다', async () => {
    const app = createApp(okLlm);
    const e = env({ DAILY_LIMIT_SCORE: '1' });
    for (let i = 0; i < 2; i++) {
      const auth = { authorization: `Bearer ${await install(app, e)}` };
      const res = await app.request('/v1/score', post('/v1/score', scoreReq, auth), e);
      expect(res.status).toBe(200);
    }
  });

  it('형식이 틀린 요청은 하루 한도에 세지 않는다', async () => {
    const app = createApp(okLlm);
    const e = env({ DAILY_LIMIT_SCORE: '1' });
    const auth = { authorization: `Bearer ${await install(app, e)}` };
    await app.request('/v1/score', post('/v1/score', { nope: true }, auth), e);
    const res = await app.request('/v1/score', post('/v1/score', scoreReq, auth), e);
    expect(res.status).toBe(200);
  });

  it('모델이 거절하면 422, 그 밖의 실패는 502', async () => {
    for (const [error, status] of [
      ['refusal (cyber)', 422],
      ['API 529: overloaded', 502],
    ] as const) {
      const app = createApp(async () => ({ ok: false, error, raw: null, usage: null }));
      const auth = { authorization: `Bearer ${await install(app)}` };
      const res = await app.request('/v1/score', post('/v1/score', scoreReq, auth), env());
      expect(res.status).toBe(status);
    }
  });

  it('실패하면 원인 코드만 로그에 남기고 메시지는 남기지 않는다', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = createApp(async () => ({
      ok: false,
      error: '스키마 불일치: tip: 비밀문장-지우-0412',
      raw: '{"tip":"비밀문장-지우-0412"}',
      usage: { inputTokens: 100, outputTokens: 20 },
    }));
    const auth = { authorization: `Bearer ${await install(app)}` };
    const res = await app.request('/v1/score', post('/v1/score', scoreReq, auth), env());
    expect(res.status).toBe(502);
    const logged = log.mock.calls.flat().join('\n');
    expect(logged).toContain('"upstream":"bad_schema"');
    expect(logged).not.toContain('비밀문장');
  });

  it('API 오류는 상태 코드로 분류한다', () => {
    expect(failureKind('API 401: invalid x-api-key')).toBe('api_401');
    expect(failureKind('API undefined: Connection error.')).toBe('api_other');
    expect(failureKind('refusal (cyber)')).toBe('refusal');
    expect(failureKind('max_tokens')).toBe('max_tokens');
    expect(failureKind('JSON 파싱 실패')).toBe('bad_json');
    expect(failureKind('TypeError: fetch failed')).toBe('network');
  });

  it('채점이 75점 이상이면 대안 답장은 비운다 (응답 계약)', async () => {
    const high = { ...SCORE, suggestion: { text: '대안', expectedScore: 88 } };
    const app = createApp(async () => ({ ok: true, data: high, usage: null as never }));
    const auth = { authorization: `Bearer ${await install(app)}` };
    const res = await app.request('/v1/score', post('/v1/score', scoreReq, auth), env());
    expect(((await res.json()) as ReplyScore).suggestion).toBeNull();
  });

  it('감정소가 제안한 성향 중 민감정보는 빼고 돌려준다', async () => {
    const analysis: AnalyzeResult = {
      focusMessage: '오늘 교회 다녀왔어',
      signals: [{ label: '대화 의지', level: 'high', value: 0.8 }],
      interpretation: '해석',
      replies: [1, 2, 3].map((i) => ({ text: `답장 ${i}`, expectedScore: 80 })),
      traitSuggestions: ['교회를 열심히 다니는 편', '하루 일을 먼저 공유하는 편'],
    };
    const app = createApp(async () => ({ ok: true, data: analysis, usage: null as never }));
    const auth = { authorization: `Bearer ${await install(app)}` };
    const req = {
      lines: [{ speaker: 'partner', text: '오늘 교회 다녀왔어' }],
      partner: scoreReq.partner,
      mode: 'normal',
    };
    const res = await app.request('/v1/analyze', post('/v1/analyze', req, auth), env());
    expect(res.status).toBe(200);
    expect(((await res.json()) as AnalyzeResult).traitSuggestions).toEqual([
      '하루 일을 먼저 공유하는 편',
    ]);
  });

  it('로그에는 대화 내용이 남지 않는다', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = createApp(okLlm);
    const auth = { authorization: `Bearer ${await install(app)}` };
    const req = { ...scoreReq, draft: '비밀문장-지우-0412' };
    await app.request('/v1/score', post('/v1/score', req, auth), env());
    const logged = log.mock.calls.flat().join('\n');
    expect(logged).toContain('"path":"/v1/score"');
    expect(logged).toContain('"inTok":100');
    expect(logged).not.toContain('비밀문장');
    expect(logged).not.toContain('야근');
  });
});
