import { DurableObject } from 'cloudflare:workers';

import { consumeQuota, type QuotaState } from './quota';

/** 마지막으로 쓴 뒤 이만큼 지나면 기록을 지운다 (오늘 · 어제 횟수만 의미가 있다) */
const FORGET_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * 설치 ID 하나당 하나씩 생기는 작은 저장소 (Durable Object). 하루 사용 횟수만 센다.
 * 한 인스턴스는 한 번에 요청 하나만 처리해서 동시에 불려도 횟수가 꼬이지 않는다.
 */
export class UsageCounter extends DurableObject {
  async consume(feature: string, limit: number, day: string) {
    const state = await this.ctx.storage.get<QuotaState>('quota');
    const res = consumeQuota(state, day, feature, limit);
    await this.ctx.storage.put('quota', res.next);
    await this.ctx.storage.setAlarm(Date.now() + FORGET_AFTER_MS);
    return { ok: res.ok, used: res.used };
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
