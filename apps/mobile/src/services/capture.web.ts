import type { ChatLine } from '@loveassist/shared';

// 웹 미리보기에는 기기 OCR이 없다. 캡처 불러오기는 폰 테스트 앱에서만 된다.

export const MAX_CAPTURES = 5;
export const captureSupported = false;

export type CaptureResult =
  | { ok: true; lines: ChatLine[]; images: number }
  | { ok: false; reason: 'canceled' | 'unsupported' | 'no_text' | 'failed' };

export const CAPTURE_ERRORS: Record<Exclude<CaptureResult, { ok: true }>['reason'], string | null> =
  {
    canceled: null,
    unsupported: '웹 미리보기에서는 캡처를 읽을 수 없어요. 폰에서 확인해 주세요.',
    no_text: '캡처에서 대화를 찾지 못했어요.',
    failed: '캡처를 읽지 못했어요.',
  };

export async function readCaptures(_partnerLabel: string): Promise<CaptureResult> {
  return { ok: false, reason: 'unsupported' };
}
