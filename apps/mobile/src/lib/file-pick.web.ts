import * as DocumentPicker from 'expo-document-picker';

import { keepRecentRows } from './style-sample';

// 웹 미리보기용: 브라우저가 고른 파일을 메모리에서만 읽는다 (디스크 복사본 없음).

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type PickResult =
  | { ok: true; text: string; name: string }
  | { ok: false; reason: 'canceled' | 'not_text' | 'too_large' | 'unreadable' };

export async function pickChatFile(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['text/plain', '.txt'],
    base64: false,
  });
  if (res.canceled) return { ok: false, reason: 'canceled' };
  const asset = res.assets[0]!;
  if (!/\.txt$/i.test(asset.name)) return { ok: false, reason: 'not_text' };
  if ((asset.size ?? 0) > MAX_FILE_BYTES) return { ok: false, reason: 'too_large' };
  try {
    const text = asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text();
    return { ok: true, text: keepRecentRows(text), name: asset.name };
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
}

export const PICK_ERRORS: Record<Exclude<PickResult, { ok: true }>['reason'], string | null> = {
  canceled: null,
  not_text:
    '.txt 파일만 불러올 수 있어요. 카톡 "대화 내보내기 → 텍스트만 보내기"로 만든 파일을 골라 주세요.',
  too_large: '파일이 너무 커요 (10MB까지). 최근 대화만 내보내 주세요.',
  unreadable: '파일을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.',
};
