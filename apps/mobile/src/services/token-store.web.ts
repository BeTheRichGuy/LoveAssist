import type { TokenStore } from '@/lib/relay-client';

// 웹 미리보기에는 보안 저장소가 없어 메모리에만 둔다 (새로고침하면 새로 받는다)
let token: string | null = null;

export const tokenStore: TokenStore = {
  load: async () => token,
  save: async (t) => {
    token = t;
  },
};
