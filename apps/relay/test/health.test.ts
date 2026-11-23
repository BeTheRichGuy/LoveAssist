import { describe, expect, it } from 'vitest';
import { HealthResponse } from '@loveassist/shared';
import { createApp } from '../src/app';

// index.ts는 Cloudflare 전용 모듈(Durable Object)을 불러와서 Node 테스트에서는 app만 쓴다
const app = createApp();

describe('GET /health', () => {
  it('공유 스키마에 맞는 응답을 돌려준다', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(HealthResponse.safeParse(await res.json()).success).toBe(true);
  });

  it('없는 경로는 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
  });
});
