import * as SecureStore from 'expo-secure-store';

import type { TokenStore } from '@/lib/relay-client';

// 중계 서버 설치 토큰. DB 키와 같이 기기 보안 저장소에만 둔다 (이 기기에서만, 백업 제외)
const KEY_NAME = 'relay_token_v1';

export const tokenStore: TokenStore = {
  load: () => SecureStore.getItemAsync(KEY_NAME),
  save: (token) =>
    SecureStore.setItemAsync(KEY_NAME, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
};
