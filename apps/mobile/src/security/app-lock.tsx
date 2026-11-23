import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeartIcon } from '@/components/icons';
import { AppText } from '@/components/text';
import { Button } from '@/components/ui';
import { colors } from '@/theme/tokens';

// 앱 잠금 (설계 원칙: 생체인증 앱 잠금 기본 제공).
// - 앱을 처음 열 때, 그리고 백그라운드에 1분 넘게 있다가 돌아올 때 잠근다.
//   (카톡에서 대화를 복사해 오는 동안 매번 잠기지 않도록 1분 유예)
// - 지문 · 얼굴이 없으면 기기 PIN · 패턴으로 푼다. 기기에 화면 잠금 자체가 없으면 보호할 수 없어서 안내만 한다.
// - 앱이 화면에서 벗어나면 덮개 화면으로 내용을 가린다 (안드로이드 13+는 네이티브 설정으로 미리보기 자체를 숨김).

export const LOCK_GRACE_MS = 60_000;
const ENABLED_KEY = 'app_lock_enabled';
const supported = Platform.OS !== 'web';

type LockCtx = {
  enabled: boolean;
  /** 끄거나 켤 때 본인 확인을 거친다. 실패하면 false */
  setEnabled: (v: boolean) => Promise<boolean>;
};
const Ctx = createContext<LockCtx>({ enabled: false, setEnabled: async () => false });
export const useAppLock = () => useContext(Ctx);

export async function deviceSecurityLevel(): Promise<LocalAuthentication.SecurityLevel> {
  if (!supported) return LocalAuthentication.SecurityLevel.NONE;
  return LocalAuthentication.getEnrolledLevelAsync();
}

async function authenticate(prompt: string) {
  return LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    promptDescription: '지문 · 얼굴 또는 기기 PIN으로 확인해요',
    cancelLabel: '취소',
    disableDeviceFallback: false,
  });
}

export function AppLockGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean | null>(supported ? null : false);
  const [locked, setLocked] = useState(supported);
  const [covered, setCovered] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    if (!supported) return;
    SecureStore.getItemAsync(ENABLED_KEY).then((v) => {
      const on = v !== '0'; // 기본값은 켜짐
      setEnabledState(on);
      if (!on) setLocked(false);
    });
  }, []);

  useEffect(() => {
    if (!supported) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setCovered(false);
        const away = backgroundAt.current;
        backgroundAt.current = null;
        if (enabled && away !== null && Date.now() - away > LOCK_GRACE_MS) setLocked(true);
      } else {
        setCovered(true);
        if (next === 'background' && backgroundAt.current === null)
          backgroundAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const setEnabled = useCallback(async (v: boolean) => {
    if ((await deviceSecurityLevel()) === LocalAuthentication.SecurityLevel.NONE && v) return false;
    const res = await authenticate(v ? '앱 잠금 켜기' : '앱 잠금 끄기');
    if (!res.success) return false;
    await SecureStore.setItemAsync(ENABLED_KEY, v ? '1' : '0');
    setEnabledState(v);
    return true;
  }, []);

  const showLock = enabled !== false && locked;
  return (
    <Ctx.Provider value={{ enabled: enabled ?? false, setEnabled }}>
      {children}
      {showLock ? (
        <LockScreen ready={enabled !== null} onUnlock={() => setLocked(false)} />
      ) : covered ? (
        <Cover />
      ) : null}
    </Ctx.Provider>
  );
}

function Cover() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.cover]} pointerEvents="none">
      <HeartIcon size={48} color={colors.accent} />
    </View>
  );
}

function LockScreen({ ready, onUnlock }: { ready: boolean; onUnlock: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [noDeviceLock, setNoDeviceLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const tried = useRef(false);

  const tryUnlock = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      if ((await deviceSecurityLevel()) === LocalAuthentication.SecurityLevel.NONE) {
        setNoDeviceLock(true);
        return;
      }
      const res = await authenticate('연애 어시스턴트 잠금 해제');
      if (res.success) return onUnlock();
      if (res.error === 'lockout') setMessage('시도가 너무 많아요. 잠시 후 다시 해 주세요.');
      else if (
        res.error !== 'user_cancel' &&
        res.error !== 'system_cancel' &&
        res.error !== 'app_cancel'
      )
        setMessage('확인하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }, [onUnlock]);

  useEffect(() => {
    // 화면이 뜨면 한 번 자동으로 인증 창을 띄운다
    if (ready && !tried.current) {
      tried.current = true;
      tryUnlock();
    }
  }, [ready, tryUnlock]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.lock]}>
      <SafeAreaView style={styles.lockInner} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <HeartIcon size={56} color={colors.accent} />
          <AppText variant="title">잠겨 있어요</AppText>
          <AppText variant="caption" style={{ textAlign: 'center' }}>
            {noDeviceLock
              ? '이 기기에 화면 잠금(PIN · 패턴 · 지문)이 없어서 앱을 보호할 수 없어요.\n기기 설정에서 화면 잠금을 켜 주세요.'
              : '지문 · 얼굴 또는 기기 PIN으로 열 수 있어요'}
          </AppText>
          {message ? (
            <AppText variant="caption" color={colors.warning}>
              {message}
            </AppText>
          ) : null}
        </View>
        {noDeviceLock ? (
          <Button label="보호 없이 들어가기" variant="secondary" onPress={onUnlock} />
        ) : (
          <Button label="잠금 해제" loading={busy} disabled={!ready} onPress={tryUnlock} />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 100,
  },
  lock: { backgroundColor: colors.bg, zIndex: 101, elevation: 101 },
  lockInner: { flex: 1, padding: 24, gap: 12 },
});
