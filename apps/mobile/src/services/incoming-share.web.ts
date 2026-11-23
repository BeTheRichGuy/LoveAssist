import type { PickResult } from '@/lib/file-pick';

// 웹 미리보기에는 다른 앱에서 공유받는 기능이 없다
export const hasPendingShare = () => false;

export async function takeSharedChat(): Promise<PickResult | null> {
  return null;
}
