import { Redirect } from 'expo-router';

import { ScoreModePractice } from '@/components/practice-score-mode';
import { StoryModePractice } from '@/components/practice-story-mode';
import { usePractice } from '@/hooks/use-practice';
import { useAppState } from '@/state/app-state';

// ⑤ 메인 시뮬레이션. 채점 엔진(usePractice)은 하나, 스킨만 스타일 설정에 따라 바뀐다.
export default function Practice() {
  const { state } = useAppState();
  // 상대가 없으면 연습을 열지 않는다. usePractice는 열자마자 AI에 첫 마디를 요청하므로 이 확인 뒤에 둔다
  if (!state.partner) return <Redirect href="/analyze" />;
  return <PracticeSession story={state.onboarding.style === 'story'} />;
}

function PracticeSession({ story }: { story: boolean }) {
  const p = usePractice();
  return story ? <StoryModePractice p={p} /> : <ScoreModePractice p={p} />;
}
