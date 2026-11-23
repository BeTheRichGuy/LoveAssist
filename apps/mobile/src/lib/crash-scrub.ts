// 크래시 리포트(Sentry)로 보내기 전에 대화 · 입력이 섞일 수 있는 부분을 모두 지운다
// (설계 원칙: 크래시 리포트에 대화 내용 포함). 남기는 것: 오류 종류, 코드 위치(스택),
// 기기 · OS · 앱 버전, 태그. 오류 메시지 자체도 지운다: "… (지우: 그냥 좀 그랬어)"처럼 값이 섞일 수 있다.
// Sentry 타입을 가져오지 않는 순수 함수라 vitest로 테스트한다.

type Frame = Record<string, unknown>;
export interface CrashEvent {
  message?: unknown;
  exception?: { values?: { type?: string; value?: string; stacktrace?: { frames?: Frame[] } }[] };
  breadcrumbs?: unknown[];
  request?: unknown;
  user?: unknown;
  extra?: unknown;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  [key: string]: unknown;
}

const KEEP_CONTEXTS = ['os', 'device', 'app'];
/** 스택 프레임은 위치 정보만 (변수 값 vars 등은 버린다) */
const KEEP_FRAME = ['filename', 'abs_path', 'module', 'function', 'lineno', 'colno', 'in_app'];
const REMOVED = '[제거됨]';

const pick = (o: Frame, keys: string[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => keys.includes(k)));

export function scrubCrashEvent<E extends CrashEvent>(event: E): E {
  const contexts = event.contexts
    ? Object.fromEntries(Object.entries(event.contexts).filter(([k]) => KEEP_CONTEXTS.includes(k)))
    : undefined;
  return {
    ...event,
    message: event.message === undefined ? undefined : REMOVED,
    exception: event.exception && {
      values: event.exception.values?.map((v) => ({
        type: v.type,
        value: v.value === undefined ? undefined : REMOVED,
        stacktrace: v.stacktrace && {
          frames: v.stacktrace.frames?.map((f) => pick(f, KEEP_FRAME)),
        },
      })),
    },
    breadcrumbs: [],
    // captureMessage · 콘솔 연동은 message 대신 logentry에 원문(과 치환 값 params)을 담는다
    logentry: undefined,
    // 다른 스레드의 스택 (프레임에 변수 값이 붙을 수 있고, 원인 파악엔 exception 스택으로 충분)
    threads: undefined,
    request: undefined,
    user: undefined,
    extra: undefined,
    contexts,
  };
}
