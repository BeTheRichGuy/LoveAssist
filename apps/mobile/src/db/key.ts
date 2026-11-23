import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// DB 암호화 키. 처음 실행할 때 256비트 랜덤 키를 만들어 기기 보안 저장소에만 둔다
// (Android Keystore / iOS Keychain "이 기기에서만"). 키는 백업 · 기기 이전으로 넘어가지 않는다.
const KEY_NAME = 'db_key_v1';

export async function getOrCreateDbKey(): Promise<{ key: string; created: boolean }> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return { key: existing, created: false };
  const key = Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return { key, created: true };
}
