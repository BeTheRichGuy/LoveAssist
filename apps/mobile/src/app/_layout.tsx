import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans';
import {
  GothicA1_400Regular,
  GothicA1_500Medium,
  GothicA1_700Bold,
} from '@expo-google-fonts/gothic-a1';
import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DbProvider } from '@/db/provider';
import { ShareRouter } from '@/components/share-router';
import { AppLockGate } from '@/security/app-lock';
import { initCrashReporting } from '@/services/crash-report';
import { AppStateProvider } from '@/state/app-state';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
initCrashReporting();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    primary: colors.accent,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BlackHanSans_400Regular,
    GothicA1_400Regular,
    GothicA1_500Medium,
    GothicA1_700Bold,
    GowunDodum_400Regular,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // 폰트를 못 불러와도 기본 글꼴로 앱은 뜨게 한다
  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={theme}>
      {/* 잠금 화면이 가장 바깥에서 모든 화면을 덮는다. DB는 잠금 뒤에서 미리 연다 */}
      <AppLockGate>
        <DbProvider>
          <AppStateProvider>
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
            />
            <ShareRouter />
          </AppStateProvider>
        </DbProvider>
      </AppLockGate>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
