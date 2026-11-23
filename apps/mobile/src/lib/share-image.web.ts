import type { RefObject } from 'react';
import type { View } from 'react-native';

// 웹 미리보기에서는 이미지 공유를 지원하지 않는다.
// react-native-view-shot(웹에서는 html2canvas)을 번들에 넣지 않으려고 파일을 나눴다.
export async function shareViewAsImage(_ref: RefObject<View | null>): Promise<string | null> {
  return '웹 미리보기에서는 공유가 안 돼요. 폰에서 확인해 주세요.';
}
