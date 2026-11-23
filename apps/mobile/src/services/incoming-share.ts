import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { MAX_FILE_BYTES, type PickResult } from '@/lib/file-pick';
import { keepRecentRows } from '@/lib/style-sample';

// 카톡 · 라인 "대화 내보내기 → 공유"로 이 앱에 보낸 txt 받기 (Android, expo-sharing).
// 카톡은 txt에 text/plain이 아닌 종류를 붙여 보내서, 모든 종류를 받고 여기서 txt인지 확인한다.
// expo-sharing이 받은 파일을 앱 캐시에 복사해 두므로, 읽은 직후 그 사본을 지우고 공유 기록도 비운다
// (설계 원칙: 원본은 처리 직후 디스크에서 삭제). 웹 미리보기는 incoming-share.web.ts.

/** "file:/data/…" (슬래시 하나) 꼴도 Paths.cache.uri와 비교할 수 있게 맞춘다 */
const normalize = (uri: string) => uri.replace(/^file:\/(?!\/)/, 'file:///');

function deleteCachedCopy(uri: string) {
  try {
    const u = normalize(uri);
    if (!u.startsWith(Paths.cache.uri)) return;
    const file = new File(u);
    if (file.exists) file.delete();
  } catch {
    // 앱 캐시라 OS가 언젠가 정리한다
  }
}

/** 다른 앱에서 공유받고 아직 읽지 않은 것이 있는지 */
export const hasPendingShare = () => {
  try {
    return Sharing.getSharedPayloads().length > 0;
  } catch {
    return false;
  }
};

/** 공유로 받은 대화 파일. 받은 게 없으면 null */
export async function takeSharedChat(): Promise<PickResult | null> {
  if (!hasPendingShare()) return null;
  let payloads: Awaited<ReturnType<typeof Sharing.getResolvedSharedPayloadsAsync>> = [];
  try {
    payloads = await Sharing.getResolvedSharedPayloadsAsync();
  } catch {
    Sharing.clearSharedPayloads();
    return { ok: false, reason: 'unreadable' };
  }
  try {
    const p = payloads[0];
    if (!p) return null;
    // 파일로 온 경우 (카톡 · 라인 내보내기)
    if (p.contentUri && p.contentType !== 'website') {
      const name = p.originalName ?? '';
      if (name && !/\.txt$/i.test(name) && !(p.contentMimeType ?? '').startsWith('text/')) {
        return { ok: false, reason: 'not_text' };
      }
      if ((p.contentSize ?? 0) > MAX_FILE_BYTES) return { ok: false, reason: 'too_large' };
      const text = await new File(normalize(p.contentUri)).text();
      return { ok: true, text: keepRecentRows(text), name };
    }
    // 글자로 온 경우
    if (p.shareType === 'text' && p.value.trim()) {
      return { ok: true, text: keepRecentRows(p.value), name: '' };
    }
    return { ok: false, reason: 'not_text' };
  } catch {
    return { ok: false, reason: 'unreadable' };
  } finally {
    for (const p of payloads) if (p.contentUri) deleteCachedCopy(p.contentUri);
    Sharing.clearSharedPayloads();
  }
}
