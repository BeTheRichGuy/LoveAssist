import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';

import { hasPendingShare } from '@/services/incoming-share';

/**
 * 카톡 · 라인에서 공유로 앱이 열렸는데 말투 학습 화면이 아니면 그리로 보낸다.
 * +native-intent의 경로 바꾸기가 놓치는 경우(앱이 이미 켜져 있을 때 · 잠금을 푼 뒤 등)를 대비한 안전장치.
 * 받은 파일은 말투 학습 화면이 읽고 지운다.
 */
export function ShareRouter() {
  const pathname = usePathname();
  const path = useRef(pathname);
  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 경로 바꾸기가 먼저 끝나도록 잠깐 기다린 뒤 확인한다 (같은 화면이 두 번 열리지 않게)
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (hasPendingShare() && path.current !== '/style-learn') {
          router.push({ pathname: '/style-learn', params: { shared: String(Date.now()) } });
        }
      }, 700);
    };
    check();
    const app = AppState.addEventListener('change', (s) => s === 'active' && check());
    const link = Linking.addEventListener('url', check);
    return () => {
      clearTimeout(timer);
      app.remove();
      link.remove();
    };
  }, []);
  return null;
}
