import * as Sentry from '@sentry/react-native';

import { scrubCrashEvent, type CrashEvent } from '@/lib/crash-scrub';

// 크래시 리포트 (Sentry). DSN은 apps/mobile/.env의 EXPO_PUBLIC_SENTRY_DSN (공개돼도 되는 값).
// DSN이 없거나 개발 모드면 아무것도 보내지 않는다.
// 보내는 것: 오류 종류 · 코드 위치 · 기기/OS/앱 버전. 대화 · 입력 · 화면 캡처 · 사용 기록은 보내지 않는다.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const crashReportingEnabled = Boolean(dsn) && !__DEV__;

export function initCrashReporting() {
  if (!crashReportingEnabled) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // 사용 기록(터치 · 화면 이동 · 콘솔 · 네트워크)은 대화 내용이 섞일 수 있어 아예 남기지 않는다
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    tracesSampleRate: 0,
    // scrubCrashEvent는 Sentry 타입을 모르는 순수 함수라 경계에서만 형을 맞춘다
    beforeSend: (event) =>
      scrubCrashEvent(event as unknown as CrashEvent) as unknown as typeof event,
  });
}

/**
 * 크래시 리포트 점검용 오류 1건. 일부러 대화처럼 보이는 글자를 넣어 보내고,
 * Sentry 화면에서 그 글자가 지워졌는지 확인한다 (9단계 테스트 가이드).
 */
export function sendTestCrash() {
  Sentry.captureException(new Error('테스트 오류 — 지우: 오늘 서운했어 (이 문장은 지워져야 함)'));
}
