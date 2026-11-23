import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { AiError, createRelayClient, describeAiError, type TokenStore } from './relay-client';

const Result = z.object({ ok: z.literal(true) });

function memoryTokens(initial: string | null = null): TokenStore & { value: string | null } {
  const store = {
    value: initial,
    load: async () => store.value,
    save: async (t: string) => {
      store.value = t;
    },
  };
  return store;
}

/** 경로별로 미리 정한 응답을 차례로 돌려주는 가짜 fetch */
function fakeFetch(routes: Record<string, { status: number; json: unknown }[]>) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    const next = routes[path]?.shift();
    if (!next) throw new Error(`예상하지 못한 요청: ${path}`);
    void init;
    return new Response(JSON.stringify(next.json), { status: next.status });
  });
}

const client = (fetch: typeof globalThis.fetch, tokens: TokenStore, inviteCode = 'invite') =>
  createRelayClient({ url: 'https://relay.test/', inviteCode, tokens, fetch });

describe('relay client', () => {
  it('토큰이 없으면 초대 코드로 받아 저장한 뒤 그 토큰으로 부른다', async () => {
    const tokens = memoryTokens();
    const fetch = fakeFetch({
      '/v1/install': [{ status: 200, json: { token: 'T1' } }],
      '/v1/analyze': [{ status: 200, json: { ok: true } }],
    });
    await expect(client(fetch, tokens).call('/v1/analyze', {}, Result)).resolves.toEqual({
      ok: true,
    });
    expect(tokens.value).toBe('T1');
    const headers = fetch.mock.calls[1]![1]!.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer T1');
  });

  it('토큰이 없을 때 동시에 여러 번 불러도 설치 등록은 한 번만 한다', async () => {
    const tokens = memoryTokens();
    const fetch = fakeFetch({
      '/v1/install': [{ status: 200, json: { token: 'T1' } }],
      '/v1/analyze': [
        { status: 200, json: { ok: true } },
        { status: 200, json: { ok: true } },
      ],
    });
    const c = client(fetch, tokens);
    await Promise.all([c.call('/v1/analyze', {}, Result), c.call('/v1/analyze', {}, Result)]);
    const installs = fetch.mock.calls.filter(([url]) => String(url).endsWith('/v1/install'));
    expect(installs).toHaveLength(1);
  });

  it('401이면 토큰을 한 번만 새로 받아 다시 부른다', async () => {
    const tokens = memoryTokens('OLD');
    const fetch = fakeFetch({
      '/v1/analyze': [
        { status: 401, json: { error: 'unauthorized' } },
        { status: 200, json: { ok: true } },
      ],
      '/v1/install': [{ status: 200, json: { token: 'NEW' } }],
    });
    await client(fetch, tokens).call('/v1/analyze', {}, Result);
    expect(tokens.value).toBe('NEW');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it.each([
    [429, 'rate_limited'],
    [422, 'refused'],
    [502, 'server'],
    [400, 'bad_request'],
  ] as const)('서버가 %i을 주면 %s 오류', async (status, kind) => {
    const fetch = fakeFetch({ '/v1/analyze': [{ status, json: { error: 'x' } }] });
    await expect(
      client(fetch, memoryTokens('T')).call('/v1/analyze', {}, Result),
    ).rejects.toMatchObject({ kind });
  });

  it('429라도 본문이 daily_limit이면 하루 한도 오류로 구분한다', async () => {
    const fetch = fakeFetch({ '/v1/score': [{ status: 429, json: { error: 'daily_limit' } }] });
    const err = await client(fetch, memoryTokens('T'))
      .call('/v1/score', {}, Result)
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'daily_limit' });
    expect(describeAiError(err)).toMatch(/오늘 쓸 수 있는 횟수/);
  });

  it('안내 문구 끝에 서버 상태 코드를 붙인다 (원인 파악용, 대화 내용은 없음)', async () => {
    const fetch = fakeFetch({ '/v1/analyze': [{ status: 502, json: { error: 'upstream' } }] });
    const err = await client(fetch, memoryTokens('T'))
      .call('/v1/analyze', {}, Result)
      .catch((e: unknown) => e);
    expect(describeAiError(err)).toMatch(/\(오류 502\)$/);
    expect(describeAiError(new AiError('offline'))).not.toMatch(/오류/);
  });

  it('응답 형식이 스키마와 다르면 server 오류', async () => {
    const fetch = fakeFetch({ '/v1/analyze': [{ status: 200, json: { ok: 'yes' } }] });
    await expect(
      client(fetch, memoryTokens('T')).call('/v1/analyze', {}, Result),
    ).rejects.toMatchObject({ kind: 'server' });
  });

  it('초대 코드가 없거나 틀리면 setup 오류', async () => {
    const empty = fakeFetch({});
    await expect(
      client(empty, memoryTokens(), '').call('/v1/analyze', {}, Result),
    ).rejects.toMatchObject({ kind: 'setup' });
    const wrong = fakeFetch({ '/v1/install': [{ status: 401, json: { error: 'unauthorized' } }] });
    await expect(
      client(wrong, memoryTokens()).call('/v1/analyze', {}, Result),
    ).rejects.toMatchObject({ kind: 'setup' });
  });

  it('네트워크가 끊기면 offline 오류', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const err = await client(fetch, memoryTokens('T'))
      .call('/v1/analyze', {}, Result)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err).toMatchObject({ kind: 'offline' });
  });

  /** 끝나지 않고 abort될 때까지 매달려 있는 요청 (연결이 끊겨 응답이 안 오는 상황) */
  const hanging = (_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_, reject) =>
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
    );

  it('응답이 오래 없을 때 연결 확인까지 실패하면 바로 offline 오류', async () => {
    const fetch = vi.fn((url: string | URL | Request, init?: RequestInit) =>
      String(url).endsWith('/health')
        ? Promise.reject(new TypeError('Network request failed'))
        : hanging(url, init),
    );
    const c = createRelayClient({
      url: 'https://relay.test',
      inviteCode: 'invite',
      tokens: memoryTokens('T'),
      fetch,
      timeoutMs: 5_000,
      probeAfterMs: 10,
    });
    const started = Date.now();
    await expect(c.call('/v1/analyze', {}, Result)).rejects.toMatchObject({ kind: 'offline' });
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('연결은 살아 있고 AI만 느리면 계속 기다리다 timeout 오류', async () => {
    const fetch = vi.fn((url: string | URL | Request, init?: RequestInit) =>
      String(url).endsWith('/health')
        ? Promise.resolve(new Response('{"ok":true}', { status: 200 }))
        : hanging(url, init),
    );
    const c = createRelayClient({
      url: 'https://relay.test',
      inviteCode: 'invite',
      tokens: memoryTokens('T'),
      fetch,
      timeoutMs: 50,
      probeAfterMs: 10,
    });
    await expect(c.call('/v1/analyze', {}, Result)).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('응답이 너무 늦으면 timeout 오류', async () => {
    const fetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
    const c = createRelayClient({
      url: 'https://relay.test',
      inviteCode: 'invite',
      tokens: memoryTokens('T'),
      fetch,
      timeoutMs: 10,
    });
    await expect(c.call('/v1/analyze', {}, Result)).rejects.toMatchObject({ kind: 'timeout' });
  });
});
