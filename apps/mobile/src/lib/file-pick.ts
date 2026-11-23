import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { keepRecentRows } from './style-sample';

// 카톡 "대화 내보내기" txt 파일 고르기. 고른 파일은 앱 캐시로 복사되는데,
// 내용을 읽은 직후 그 복사본을 지운다 (설계 원칙: 원본은 처리 직후 디스크에서 삭제).
// 웹 미리보기는 file-pick.web.ts.

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type PickResult =
  | { ok: true; text: string; name: string }
  | { ok: false; reason: 'canceled' | 'not_text' | 'too_large' | 'unreadable' };

export async function pickChatFile(): Promise<PickResult> {
  // 안드로이드 파일 앱이 .txt의 종류를 제각각 붙여서 종류로 거르지 않고 이름 · 크기로 확인한다
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  }).catch(() => null);
  if (!res) return { ok: false, reason: 'unreadable' };
  if (res.canceled) return { ok: false, reason: 'canceled' };
  const asset = res.assets[0]!;
  const copy = new File(asset.uri);
  try {
    if (!/\.txt$/i.test(asset.name)) return { ok: false, reason: 'not_text' };
    if ((asset.size ?? copy.size) > MAX_FILE_BYTES) return { ok: false, reason: 'too_large' };
    const text = keepRecentRows(await copy.text());
    return { ok: true, text, name: asset.name };
  } catch {
    return { ok: false, reason: 'unreadable' };
  } finally {
    try {
      if (copy.exists) copy.delete();
    } catch {
      // 캐시 복사본을 못 지웠다: 앱 캐시라 OS가 정리하지만, 다음에 다시 시도할 방법은 없다
    }
  }
}

export const PICK_ERRORS: Record<Exclude<PickResult, { ok: true }>['reason'], string | null> = {
  canceled: null,
  not_text:
    '.txt 파일만 불러올 수 있어요. 카톡 "대화 내보내기 → 텍스트만 보내기"로 만든 파일을 골라 주세요.',
  too_large: '파일이 너무 커요 (10MB까지). 최근 대화만 내보내 주세요.',
  unreadable: '파일을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.',
};
