import type { ChatLine } from '@loveassist/shared';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import TextRecognizer from '../../modules/text-recognizer/src/TextRecognizerModule';
import { ocrToChat } from '@/lib/capture-ocr';

// 카톡 캡처 불러오기: 갤러리에서 고른 캡처를 기기 안에서 OCR → 대화로 바꾼다.
// 이미지는 기기 밖으로 보내지 않는다 (설계 결정 6). 피커가 앱 캐시에 만든 복사본은 읽은 직후 지운다.
// 갤러리의 원본 사진은 사용자 것이라 건드리지 않는다. 웹 미리보기는 capture.web.ts.

export const MAX_CAPTURES = 5;

/** 예전에 빌드한 테스트 앱에는 OCR 모듈이 없다 */
export const captureSupported = TextRecognizer !== null;

export type CaptureResult =
  | { ok: true; lines: ChatLine[]; images: number }
  | { ok: false; reason: 'canceled' | 'unsupported' | 'no_text' | 'failed' };

export const CAPTURE_ERRORS: Record<Exclude<CaptureResult, { ok: true }>['reason'], string | null> =
  {
    canceled: null,
    unsupported: '이 테스트 앱에는 캡처 읽기 기능이 없어요. 새로 빌드한 앱을 설치해 주세요.',
    no_text: '캡처에서 대화를 찾지 못했어요. 카톡 대화방 캡처인지 확인해 주세요.',
    failed: '캡처를 읽지 못했어요. 다른 캡처로 다시 시도해 주세요.',
  };

function deleteCachedCopy(uri: string) {
  try {
    if (!uri.startsWith(Paths.cache.uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 앱 캐시라 OS가 언젠가 정리한다
  }
}

export async function readCaptures(partnerLabel: string): Promise<CaptureResult> {
  if (!TextRecognizer) return { ok: false, reason: 'unsupported' };
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_CAPTURES,
    orderedSelection: true,
    quality: 1,
    exif: false,
  });
  if (picked.canceled) return { ok: false, reason: 'canceled' };
  const lines: ChatLine[] = [];
  let failed = false;
  // 고른 순서대로 이어 붙인다 (위로 스크롤해 찍은 캡처부터 고르면 시간 순)
  for (const asset of picked.assets) {
    try {
      const ocr = await TextRecognizer.recognizeAsync(asset.uri);
      lines.push(...ocrToChat(ocr, partnerLabel).lines);
    } catch {
      failed = true;
    } finally {
      deleteCachedCopy(asset.uri);
    }
  }
  if (lines.length === 0) return { ok: false, reason: failed ? 'failed' : 'no_text' };
  return { ok: true, lines, images: picked.assets.length };
}
