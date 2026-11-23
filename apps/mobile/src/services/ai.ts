import {
  AnalyzeResult,
  ReplyScore,
  SimulateResponse,
  StyleResult,
  type AnalyzeRequest,
  type ScoreRequest,
  type SimulateRequest,
  type StyleRequest,
} from '@loveassist/shared';

import { createRelayClient } from '@/lib/relay-client';

import { tokenStore } from './token-store';

// 실제 AI 호출 (중계 서버 경유). API 키는 서버에만 있고 앱에는 초대 코드만 들어간다.
// 주소 · 초대 코드는 apps/mobile/.env 의 EXPO_PUBLIC_RELAY_URL · EXPO_PUBLIC_INVITE_CODE (apps/mobile/.env.example 참고).
// 감정소(5단계) · 시뮬레이션 상대(7단계) · 답장 채점(8단계)을 모두 중계 서버로 부른다.

const relay = createRelayClient({
  url: process.env.EXPO_PUBLIC_RELAY_URL ?? 'http://localhost:8787',
  inviteCode: process.env.EXPO_PUBLIC_INVITE_CODE ?? '',
  tokens: tokenStore,
});

export const analyze = (req: AnalyzeRequest) => relay.call('/v1/analyze', req, AnalyzeResult);

/** 시뮬레이션 상대의 다음 메시지. 기록이 비어 있으면 상대가 먼저 말을 건다 */
export const simulate = (req: SimulateRequest) => relay.call('/v1/simulate', req, SimulateResponse);

/** 보내기 전 답장 채점 (Haiku 생각 끔, 75점 이상이면 대안 없음) */
export const score = (req: ScoreRequest) => relay.call('/v1/score', req, ReplyScore);

/** 대화 파일 표본으로 내 말투 요약 · 상대 성향 후보 받기 (승인한 것만 저장) */
export const learnStyle = (req: StyleRequest) => relay.call('/v1/style', req, StyleResult);
