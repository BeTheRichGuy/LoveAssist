import { ApiError, InstallResponse } from '@loveassist/shared';
import type { z } from 'zod';

// 중계 서버 호출. 화면 없는 순수 로직이라 vitest로 테스트한다 (기기 저장소 · 설정은 밖에서 넣는다).
// 처음 부를 때 초대 코드로 설치 토큰을 받아 저장해 두고, 서버가 401을 주면 한 번만 새로 받는다.
// 요청 · 응답 내용은 어디에도 기록하지 않는다.

export type AiErrorKind =
  | 'offline'
  | 'timeout'
  | 'rate_limited'
  | 'daily_limit'
  | 'refused'
  | 'bad_request'
  | 'setup'
  | 'server';

export class AiError extends Error {
  constructor(
    public readonly kind: AiErrorKind,
    /** 서버가 준 HTTP 상태 코드. 네트워크 오류 등 응답이 없으면 없다 */
    public readonly status?: number,
  ) {
    super(kind);
    this.name = 'AiError';
  }
}

export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  offline: '인터넷 연결을 확인하고 다시 시도해 주세요.',
  timeout: 'AI 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
  rate_limited: '요청이 너무 많아요. 1분쯤 뒤에 다시 시도해 주세요.',
  daily_limit: '오늘 쓸 수 있는 횟수를 다 썼어요. 내일(자정 이후) 다시 쓸 수 있어요.',
  refused: '이 대화는 분석할 수 없어요. 내용을 바꿔서 다시 시도해 주세요.',
  bad_request: '대화를 읽지 못했어요. 대화를 조금 줄여서 다시 시도해 주세요.',
  setup: '앱 설정에 문제가 있어요. 개발자에게 알려 주세요.',
  server: 'AI가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.',
};

/** 화면에 보여 줄 안내 문구. 원인 파악을 위해 서버 상태 코드를 붙인다 (대화 내용은 담지 않는다) */
export function describeAiError(e: unknown): string {
  const err = e instanceof AiError ? e : new AiError('server');
  const message = AI_ERROR_MESSAGES[err.kind];
  return err.status ? `${message} (오류 ${err.status})` : message;
}

export interface TokenStore {
  load(): Promise<string | null>;
  save(token: string): Promise<void>;
}

export interface RelayClientOptions {
  url: string;
  inviteCode: string;
  tokens: TokenStore;
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** 응답이 이만큼 늦으면 연결을 확인한다 */
  probeAfterMs?: number;
}

export function createRelayClient(opts: RelayClientOptions) {
  const base = opts.url.replace(/\/$/, '');
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const probeAfterMs = opts.probeAfterMs ?? 8_000;

  /** 연결이 살아 있는지 짧게 확인한다 (/health, 4초 안에 응답 없으면 끊긴 것으로 본다) */
  async function reachable(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    try {
      return (await doFetch(`${base}/health`, { signal: controller.signal })).ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async function post(path: string, body: unknown, token?: string) {
    const controller = new AbortController();
    let offline = false;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // 연결이 끊기면 요청이 실패하지 않고 매달려 있기도 한다. 응답이 늦으면 연결부터 확인해
    // 끊겼으면 바로 알리고, 살아 있으면(AI가 느린 것) 계속 기다린다
    const probe = setTimeout(async () => {
      if (!(await reachable()) && !controller.signal.aborted) {
        offline = true;
        controller.abort();
      }
    }, probeAfterMs);
    try {
      const res = await doFetch(base + path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json: unknown = await res.json().catch(() => null);
      return { status: res.status, json };
    } catch {
      throw new AiError(controller.signal.aborted && !offline ? 'timeout' : 'offline');
    } finally {
      clearTimeout(timer);
      clearTimeout(probe);
    }
  }

  async function issueToken(): Promise<string> {
    if (!opts.inviteCode) throw new AiError('setup');
    const res = await post('/v1/install', { inviteCode: opts.inviteCode });
    if (res.status === 429) throw new AiError('rate_limited', 429);
    const parsed = InstallResponse.safeParse(res.json);
    if (res.status !== 200 || !parsed.success) {
      throw new AiError(res.status === 401 ? 'setup' : 'server', res.status);
    }
    await opts.tokens.save(parsed.data.token);
    return parsed.data.token;
  }

  /** 발급 중인 토큰. 동시에 여러 요청이 와도 설치 등록은 한 번만 한다 */
  let issuing: Promise<string> | null = null;
  const freshToken = () =>
    (issuing ??= issueToken().finally(() => {
      issuing = null;
    }));

  async function call<S extends z.ZodType>(path: string, body: unknown, schema: S) {
    let token = (await opts.tokens.load()) ?? (await freshToken());
    let res = await post(path, body, token);
    // 서버 서명 키가 바뀌면 예전 토큰은 무효다. 한 번만 새로 받는다
    if (res.status === 401) {
      token = await freshToken();
      res = await post(path, body, token);
    }
    if (res.status === 200) {
      const parsed = schema.safeParse(res.json);
      if (parsed.success) return parsed.data as z.infer<S>;
      throw new AiError('server', 200);
    }
    const kinds: Record<number, AiErrorKind> = {
      400: 'bad_request',
      401: 'setup',
      422: 'refused',
      429: 'rate_limited',
    };
    // 429는 분당 제한과 하루 한도 두 가지라 본문의 오류 코드로 나눈다
    const dailyLimit =
      res.status === 429 && ApiError.safeParse(res.json).data?.error === 'daily_limit';
    throw new AiError(dailyLimit ? 'daily_limit' : (kinds[res.status] ?? 'server'), res.status);
  }

  return { call };
}
