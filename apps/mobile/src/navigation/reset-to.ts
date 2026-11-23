import { router, type Href } from 'expo-router';

/**
 * 흐름이 끝나는 지점(온보딩 완료, 프로필 만들기 완료, 처음부터 다시, 정리하기)에서 쓴다.
 * 쌓인 화면을 비우고 새 화면으로 간다. 그냥 replace만 하면 뒤로가기를 눌렀을 때
 * 지난 흐름의 화면(예: 예전 감정 판독 결과)이 다시 나온다.
 */
export function resetTo(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
