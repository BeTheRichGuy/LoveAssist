import { z } from 'zod';

/** API 버전. 호환되지 않는 변경이 생기면 올린다. */
export const API_VERSION = 'v1';

export const HealthResponse = z.object({
  ok: z.literal(true),
  apiVersion: z.literal(API_VERSION),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
