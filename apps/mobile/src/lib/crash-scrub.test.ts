import { describe, expect, it } from 'vitest';

import { scrubCrashEvent } from './crash-scrub';

describe('scrubCrashEvent', () => {
  const event = {
    message: '코코: 오늘 연락 거의 없더라',
    exception: {
      values: [
        {
          type: 'TypeError',
          value: "Cannot read property 'text' of undefined (지우: 그냥 좀 그랬어)",
          stacktrace: {
            frames: [
              {
                filename: 'app:///index.bundle',
                function: 'run',
                lineno: 12,
                vars: { draft: '보고 싶어' },
              },
            ],
          },
        },
      ],
    },
    breadcrumbs: [{ category: 'console', message: '나: 미안해' }],
    logentry: { message: '판독 실패: %s', params: ['서운했어'] },
    threads: {
      values: [{ stacktrace: { frames: [{ function: 'x', vars: { memo: '기념일' } }] } }],
    },
    request: { data: '{"draft":"보고 싶어"}' },
    user: { ip_address: '1.2.3.4' },
    extra: { draft: '보고 싶어' },
    contexts: {
      os: { name: 'Android', version: '15' },
      device: { model: 'SM-S921N' },
      app: { app_version: '1.0.0' },
      state: { partner: '코코' },
    },
    tags: { screen: 'practice' },
  };

  it('오류 종류 · 위치(스택) · 기기 정보만 남긴다', () => {
    const out = scrubCrashEvent(structuredClone(event));
    expect(out.exception?.values?.[0]?.type).toBe('TypeError');
    expect(out.exception?.values?.[0]?.stacktrace).toEqual({
      frames: [{ filename: 'app:///index.bundle', function: 'run', lineno: 12 }],
    });
    expect(out.contexts).toEqual({
      os: event.contexts.os,
      device: event.contexts.device,
      app: event.contexts.app,
    });
    expect(out.tags).toEqual({ screen: 'practice' });
  });

  it('대화 · 입력이 섞일 수 있는 곳은 모두 지운다', () => {
    const out = scrubCrashEvent(structuredClone(event));
    const text = JSON.stringify(out);
    for (const leaked of ['코코', '지우', '미안해', '보고 싶어', '1.2.3.4', '서운했어', '기념일']) {
      expect(text).not.toContain(leaked);
    }
    expect(out.breadcrumbs).toEqual([]);
  });
});
