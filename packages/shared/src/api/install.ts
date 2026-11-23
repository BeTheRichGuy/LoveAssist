import { z } from 'zod';

// 설치 등록: 앱이 처음 실행될 때 한 번 호출해 익명 토큰을 받는다.
// 토큰은 기기 안전 저장소에 두고 모든 AI 요청에 Authorization: Bearer <토큰>으로 보낸다.
// 지인 테스트 동안은 초대 코드가 있어야 등록된다.

export const InstallRequest = z.object({
  inviteCode: z.string().min(1).max(100),
});
export type InstallRequest = z.infer<typeof InstallRequest>;

export const InstallResponse = z.object({
  token: z.string(),
});
export type InstallResponse = z.infer<typeof InstallResponse>;

/** 오류 응답. 본문 내용은 담지 않고 코드만 준다. */
export const ApiErrorCode = z.enum([
  'bad_request',
  'unauthorized',
  'rate_limited',
  /** 설치별 하루 한도를 다 씀 (한국 시간 자정에 초기화). HTTP 429 */
  'daily_limit',
  'refused',
  'upstream',
  'internal',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiError = z.object({ error: ApiErrorCode });
export type ApiError = z.infer<typeof ApiError>;
