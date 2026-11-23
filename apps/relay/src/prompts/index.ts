import {
  AnalyzeRequest,
  AnalyzeResult,
  isSensitiveText,
  ReplyScore,
  ScoreRequest,
  SimulateRequest,
  SimulateResponse,
  StyleRequest,
  StyleResult,
} from '@loveassist/shared';
import { analyzePrompt } from './analyze';
import { scorePrompt } from './score';
import { simulatePrompt } from './simulate';
import { stylePrompt } from './style';

export type { Prompt } from './common';

/** 프롬프트를 고치면 올린다. 비교 결과 파일에 같이 기록된다. */
export const PROMPT_VERSION = 'v6';

// 기능별 요청 · 출력 스키마, 프롬프트, 모델. 중계 서버와 evals 비교 스크립트가 같이 쓴다.
// 모델은 2단계 비교로 정했다 (설계 결정 7). evals는 비교할 때 model 대신 자기 목록을 쓴다.
// 채점은 보내기마다 불리므로 가볍게, 감정소는 해석 품질이 중요해서 한 단계 높게 둔다.
export const FEATURES = {
  analyze: {
    request: AnalyzeRequest,
    prompt: analyzePrompt,
    output: AnalyzeResult,
    effort: 'medium',
    model: 'claude-sonnet-5-5',
    noThinking: false,
    /** 프롬프트로 금지해도 모델이 어길 수 있어 민감정보 성향 제안은 한 번 더 뺀다 */
    postprocess: (r: AnalyzeResult): AnalyzeResult => ({
      ...r,
      traitSuggestions: r.traitSuggestions.filter((t) => !isSensitiveText(t)),
    }),
  },
  simulate: {
    request: SimulateRequest,
    prompt: simulatePrompt,
    output: SimulateResponse,
    effort: 'low',
    model: 'claude-haiku-5-5',
    noThinking: false,
  },
  /** 내 말투 학습 (대화 파일, 드물게 쓴다). 말투 요약 품질이 중요해서 감정소와 같은 모델 */
  style: {
    request: StyleRequest,
    prompt: stylePrompt,
    output: StyleResult,
    effort: 'medium',
    model: 'claude-sonnet-5-5',
    noThinking: false,
    postprocess: (r: StyleResult): StyleResult => ({
      myStyle: r.myStyle.filter((s) => !isSensitiveText(s)).slice(0, 5),
      myStyleTips: (r.myStyleTips ?? []).filter((s) => !isSensitiveText(s)).slice(0, 2),
      partnerTraits: r.partnerTraits.filter((t) => !isSensitiveText(t)),
      partnerSpeech: r.partnerSpeech.filter((t) => !isSensitiveText(t)),
    }),
  },
  score: {
    request: ScoreRequest,
    prompt: scorePrompt,
    output: ReplyScore,
    effort: 'low',
    model: 'claude-haiku-5-5',
    noThinking: true,
    /** 응답 계약: 75점 이상이면 대안 답장이 없다. 모델이 붙여 보내도 비운다 */
    postprocess: (r: ReplyScore): ReplyScore => (r.total >= 75 ? { ...r, suggestion: null } : r),
  },
} as const;

export type Feature = keyof typeof FEATURES;
