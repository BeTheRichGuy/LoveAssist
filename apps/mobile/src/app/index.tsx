import { Redirect } from 'expo-router';

import { useAppState } from '@/state/app-state';

// 진입점: 진행 상황에 따라 온보딩 → 감정소 → 메인 중 알맞은 곳으로 보낸다.
export default function Index() {
  const { state } = useAppState();
  if (!state.onboarding.completed) return <Redirect href="/onboarding/welcome" />;
  if (!state.partner) return <Redirect href="/analyze" />;
  return <Redirect href="/home" />;
}
