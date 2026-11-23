import Anthropic from '@anthropic-ai/sdk';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import {
  API_VERSION,
  InstallRequest,
  type ApiErrorCode,
  type HealthResponse,
  type InstallResponse,
} from '@loveassist/shared';
import { generate, type GenerateResult, type Usage } from './llm/anthropic';
import { FEATURES, type Feature } from './prompts';
import { dailyLimit, kstDay } from './quota';
import { issueToken, verifyToken } from './token';
import type { UsageCounter } from './usage-counter';

// 무상태 LLM 중계 서버. 대화 내용 · 상대 정보를 저장하거나 로그로 남기지 않는다.
// 로그에는 경로 · 상태 코드 · 소요 시간 · 모델 · 토큰 수만 남긴다.

export interface Env {
  ANTHROPIC_API_KEY: string;
  /** 워크스페이스에 묶이지 않은 키를 쓸 때만 */
  ANTHROPIC_WORKSPACE_ID?: string;
  /** 설치 토큰 서명 키 */
  TOKEN_SECRET: string;
  /** 지인 테스트 초대 코드 */
  INVITE_CODE: string;
  RL_INSTALL: RateLimit;
  RL_ANALYZE: RateLimit;
  RL_SIMULATE: RateLimit;
  RL_SCORE: RateLimit;
  RL_STYLE: RateLimit;
  /** 설치별 하루 사용 횟수 (usage-counter.ts). 한도 값은 vars의 DAILY_LIMIT_<기능> */
  USAGE: DurableObjectNamespace<UsageCounter>;
}

/** 테스트에서 LLM 호출을 바꿔 끼우기 위한 자리 */
export type CallLlm = (
  env: Env,
  opts: Parameters<typeof generate>[1],
) => Promise<GenerateResult<unknown>>;

const callAnthropic: CallLlm = (env, opts) => {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    ...(env.ANTHROPIC_WORKSPACE_ID
      ? { defaultHeaders: { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } }
      : {}),
  });
  return generate(client, opts);
};

type Vars = { feature?: Feature; usage?: Usage; upstream?: string };

/**
 * LLM 실패를 로그용 고정 코드로 바꾼다. 원래 메시지는 남기지 않는다
 * (스키마 오류 · 모델 출력 등에 대화 내용이 섞일 수 있어서). 예: "API 401: ..." → "api_401"
 */
export function failureKind(error: string): string {
  const api = /^API (\d{3})/.exec(error);
  if (api) return `api_${api[1]}`;
  if (error.startsWith('API ')) return 'api_other';
  if (error.startsWith('refusal')) return 'refusal';
  if (error === 'max_tokens') return 'max_tokens';
  if (error.startsWith('JSON')) return 'bad_json';
  if (error.startsWith('스키마')) return 'bad_schema';
  return 'network';
}
type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

const LIMITERS: Record<Feature, keyof Env> = {
  analyze: 'RL_ANALYZE',
  simulate: 'RL_SIMULATE',
  score: 'RL_SCORE',
  style: 'RL_STYLE',
};

const fail = (c: Ctx, status: 400 | 401 | 422 | 429 | 500 | 502, error: ApiErrorCode) =>
  c.json({ error }, status);

export function createApp(callLlm: CallLlm = callAnthropic) {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>();

  app.use('*', async (c, next) => {
    const started = Date.now();
    await next();
    const usage = c.get('usage');
    console.log(
      JSON.stringify({
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Date.now() - started,
        feature: c.get('feature'),
        inTok: usage?.inputTokens,
        outTok: usage?.outputTokens,
        upstream: c.get('upstream'),
      }),
    );
  });
  // 웹 미리보기(npm run mobile:web)에서 부를 수 있게. 인증은 토큰으로 한다
  app.use('*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type'] }));
  app.use('/v1/*', bodyLimit({ maxSize: 64 * 1024, onError: (c) => fail(c, 400, 'bad_request') }));

  app.onError((err, c) => {
    // 오류 메시지에 요청 내용이 섞일 수 있어 이름만 남긴다
    console.log(JSON.stringify({ path: c.req.path, error: err.name }));
    return fail(c, 500, 'internal');
  });

  app.get('/health', (c) => c.json({ ok: true, apiVersion: API_VERSION } satisfies HealthResponse));

  app.post('/v1/install', async (c) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
    if (!(await c.env.RL_INSTALL.limit({ key: ip })).success) return fail(c, 429, 'rate_limited');
    const body = InstallRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return fail(c, 400, 'bad_request');
    if (body.data.inviteCode !== c.env.INVITE_CODE) return fail(c, 401, 'unauthorized');
    return c.json({ token: await issueToken(c.env.TOKEN_SECRET) } satisfies InstallResponse);
  });

  for (const feature of Object.keys(FEATURES) as Feature[]) {
    app.post(`/v1/${feature}`, async (c) => {
      c.set('feature', feature);
      const token = c.req.header('authorization')?.replace(/^Bearer /, '') ?? '';
      const installId = await verifyToken(c.env.TOKEN_SECRET, token);
      if (!installId) return fail(c, 401, 'unauthorized');
      const limiter = c.env[LIMITERS[feature]] as RateLimit;
      if (!(await limiter.limit({ key: installId })).success) return fail(c, 429, 'rate_limited');

      const f = FEATURES[feature];
      const body = f.request.safeParse(await c.req.json().catch(() => null));
      if (!body.success) return fail(c, 400, 'bad_request');

      // 하루 한도: 형식이 맞는 요청만 센다 (AI 호출이 실패해도 센다 — 비용이 들 수 있는 시도라서)
      const counter = c.env.USAGE.get(c.env.USAGE.idFromName(installId));
      const quota = await counter.consume(feature, dailyLimit(c.env, feature), kstDay());
      if (!quota.ok) return fail(c, 429, 'daily_limit');

      const res = await callLlm(c.env, {
        model: f.model,
        // 요청 스키마와 프롬프트는 같은 기능끼리 짝이 맞는다
        prompt: (f.prompt as (r: unknown) => ReturnType<typeof f.prompt>)(body.data),
        schema: f.output,
        effort: f.effort,
        noThinking: f.noThinking,
      });
      if (res.usage) c.set('usage', res.usage);
      if (res.ok) {
        const post = 'postprocess' in f ? (f.postprocess as (d: unknown) => unknown) : null;
        return c.json((post ? post(res.data) : res.data) as object);
      }
      const kind = failureKind(res.error);
      c.set('upstream', kind);
      return kind === 'refusal' ? fail(c, 422, 'refused') : fail(c, 502, 'upstream');
    });
  }

  return app;
}
