import { describe, expect, it } from 'vitest';

import { faceCrop } from './face-crop';

describe('얼굴 맞춰 자르기', () => {
  it('얼굴을 상자 가운데 · 정한 크기로 놓는다', () => {
    const r = faceCrop(100, 120, { x: 0.5, y: 0.4, w: 0.25 }, 0.5, 0.5);
    expect(r.width).toBe(200);
    expect(r.height).toBe(400);
    expect(r.left).toBe(-50); // 얼굴 중심 100px → 상자 가운데 50px
    expect(r.top).toBe(120 * 0.45 - 160);
  });

  it('상자 밖으로 빈 곳이 생기지 않게 가장자리에서 멈춘다', () => {
    const r = faceCrop(100, 120, { x: 0.95, y: 0.02, w: 0.5 }, 0.5, 0.5);
    expect(r.left).toBe(100 - r.width);
    expect(r.top).toBe(0);
    expect(r.height).toBeGreaterThanOrEqual(120);
  });

  it('얼굴이 커도 상자는 다 덮는다', () => {
    const r = faceCrop(100, 120, { x: 0.5, y: 0.5, w: 0.9 }, 0.5, 0.3);
    expect(r.width).toBeGreaterThanOrEqual(100);
    expect(r.height).toBeGreaterThanOrEqual(120);
  });
});
