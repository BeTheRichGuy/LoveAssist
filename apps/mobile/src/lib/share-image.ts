import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** 화면의 View를 PNG로 찍어 공유 시트를 연다. 웹은 share-image.web.ts */
export async function shareViewAsImage(ref: RefObject<View | null>): Promise<string | null> {
  const uri = await captureRef(ref, { format: 'png', quality: 1 });
  if (!(await Sharing.isAvailableAsync())) return '이 기기에서는 공유를 쓸 수 없어요.';
  await Sharing.shareAsync(uri);
  return null;
}
