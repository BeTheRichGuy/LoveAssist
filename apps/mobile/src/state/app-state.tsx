import {
  ConflictLevel,
  PracticeStyle,
  MyStyle,
  RelationshipStage,
  type AnalyzeResult,
  type BaseRecord,
  type ChatLine,
  type PartnerContext,
} from '@loveassist/shared';
import { randomUUID } from 'expo-crypto';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { z } from 'zod';

import { erasePartner, loadPartner, savePartner } from '@/db/partners';
import { useDb } from '@/db/provider';
import { getJsonSetting, setSetting } from '@/db/settings';
import { CHARACTER_IDS, recommendCharacter, type CharacterId } from '@/lib/characters';
import { mergeMemos } from '@/lib/memos';

// 앱 상태. 온보딩 답변(5단계)과 상대 프로필 · 승인한 성향 · 메모(6단계)는 암호화 DB에 저장해
// 앱을 꺼도 유지된다. 감정소 결과와 연습 기록은 메모리에만 둔다 (원문 · 대화 저장 금지).
// 웹 미리보기는 DB가 없어 전부 메모리.

export type MemoKind = 'anniversary' | 'likes' | 'dislikes' | 'free';

/** trait = 소통 성향 · speech = 말투 (둘 다 사용자가 승인한 것만) */
export type TraitKind = 'trait' | 'speech';
export type Trait = BaseRecord & { text: string; kind: TraitKind };
export type Memo = BaseRecord & { kind: MemoKind; text: string };
export type Partner = BaseRecord & {
  nickname: string;
  stage: RelationshipStage;
  traits: Trait[];
  memos: Memo[];
};

const OnboardingSchema = z.object({
  /** 성인 확인 · AI 고지 · 개인정보 안내에 동의한 시각 */
  consentedAt: z.string().nullable(),
  stage: RelationshipStage.nullable(),
  conflict: ConflictLevel.nullable(),
  style: PracticeStyle,
  completed: z.boolean(),
});
export type Onboarding = z.infer<typeof OnboardingSchema>;

const ONBOARDING_KEY = 'onboarding';
const MY_STYLE_KEY = 'myStyle';
const CHARACTER_KEY = 'character';
const CharacterSchema = z.enum(CHARACTER_IDS);

type State = {
  onboarding: Onboarding;
  partner: Partner | null;
  /** 마지막 감정소 결과. 원문은 담지 않는다. 닉네임 · 성향 승인 단계에서 쓰고 나면 비운다 */
  lastAnalysis: AnalyzeResult | null;
  /**
   * 감정소 결과 화면에서 "내가 쓴 답장" · 추천 답장을 채점할 때 쓰는 대화 맥락.
   * 이미 이름을 가린 최근 10줄만, 메모리에만 두고 결과 화면을 떠나면 지운다 (디스크에 쓰지 않음)
   */
  analysisContext: ChatLine[] | null;
  /** 추천 답장을 연습과 같은 채점기(Haiku)로 다시 매긴 점수. 답장 문장 → 총점 (없으면 채점 중, null이면 실패) */
  replyScores: Record<string, number | null>;
  /** 승인된 내 말투 요약 (대화 파일에서 학습, 암호화 DB에 저장) */
  myStyle: string[];
  /** 스토리 모드에서 상대로 쓸 캐릭터. null이면 승인된 성향으로 추천한 캐릭터 */
  character: CharacterId | null;
  practice: { turns: number; scoreSum: number; affinity: number | null };
};

type Action =
  | {
      type: 'restore';
      onboarding: Onboarding | null;
      partner: Partner | null;
      myStyle: string[];
      character: CharacterId | null;
    }
  | { type: 'setCharacter'; character: CharacterId | null }
  | { type: 'setMyStyle'; style: string[] }
  | { type: 'consent' }
  | { type: 'setStage'; stage: RelationshipStage }
  | { type: 'setConflict'; conflict: ConflictLevel }
  | { type: 'setStyle'; style: PracticeStyle }
  | { type: 'completeOnboarding' }
  | { type: 'setAnalysis'; result: AnalyzeResult | null; context?: ChatLine[] }
  | { type: 'setReplyScore'; text: string; total: number | null }
  | { type: 'clearAnalysisContext' }
  | { type: 'createPartner'; nickname: string; traits: string[] }
  | { type: 'updatePartner'; stage: RelationshipStage; memos: { kind: MemoKind; text: string }[] }
  | { type: 'addTraits'; traits: string[]; kind?: TraitKind }
  | { type: 'updateTrait'; id: string; text: string }
  | { type: 'removeTrait'; id: string }
  | { type: 'recordTurn'; score: number; affinity: number }
  | { type: 'wipePartner' }
  | { type: 'resetAll' };

const initialState: State = {
  onboarding: { consentedAt: null, stage: null, conflict: null, style: 'score', completed: false },
  partner: null,
  lastAnalysis: null,
  analysisContext: null,
  replyScores: {},
  myStyle: [],
  character: null,
  practice: { turns: 0, scoreSum: 0, affinity: null },
};

function newRecord(): BaseRecord {
  const now = new Date().toISOString();
  return { id: randomUUID(), createdAt: now, updatedAt: now, deletedAt: null };
}

function reducer(state: State, action: Action): State {
  const now = new Date().toISOString();
  switch (action.type) {
    case 'restore':
      return {
        ...state,
        onboarding: action.onboarding ?? state.onboarding,
        partner: action.partner,
        myStyle: action.myStyle,
        character: action.character,
      };
    case 'setCharacter':
      return { ...state, character: action.character };
    case 'consent':
      return { ...state, onboarding: { ...state.onboarding, consentedAt: now } };
    case 'setStage':
      return { ...state, onboarding: { ...state.onboarding, stage: action.stage } };
    case 'setConflict':
      return { ...state, onboarding: { ...state.onboarding, conflict: action.conflict } };
    case 'setStyle':
      return { ...state, onboarding: { ...state.onboarding, style: action.style } };
    case 'completeOnboarding':
      return { ...state, onboarding: { ...state.onboarding, completed: true } };
    case 'setAnalysis':
      return {
        ...state,
        lastAnalysis: action.result,
        analysisContext: action.context?.slice(-10) ?? null,
        replyScores: {},
      };
    case 'setMyStyle':
      return {
        ...state,
        myStyle: [...new Set(action.style.map((x) => x.trim()).filter(Boolean))].slice(0, 6),
      };
    case 'setReplyScore':
      return { ...state, replyScores: { ...state.replyScores, [action.text]: action.total } };
    case 'clearAnalysisContext':
      return { ...state, analysisContext: null };
    case 'createPartner':
      return {
        ...state,
        partner: {
          ...newRecord(),
          nickname: action.nickname,
          stage: state.onboarding.stage ?? 'some',
          traits: action.traits.map((text) => ({ ...newRecord(), text, kind: 'trait' as const })),
          memos: [],
        },
        lastAnalysis: null,
        analysisContext: null,
      };
    case 'updatePartner':
      if (!state.partner) return state;
      return {
        ...state,
        partner: {
          ...state.partner,
          stage: action.stage,
          memos: mergeMemos(state.partner.memos, action.memos, newRecord, now),
          updatedAt: now,
        },
      };
    case 'addTraits':
      if (!state.partner) return state;
      return {
        ...state,
        partner: {
          ...state.partner,
          traits: [
            ...state.partner.traits,
            ...action.traits.map((text) => ({
              ...newRecord(),
              text,
              kind: action.kind ?? 'trait',
            })),
          ],
          updatedAt: now,
        },
      };
    case 'updateTrait':
      if (!state.partner) return state;
      return {
        ...state,
        partner: {
          ...state.partner,
          traits: state.partner.traits.map((t) =>
            t.id === action.id ? { ...t, text: action.text, updatedAt: now } : t,
          ),
          updatedAt: now,
        },
      };
    case 'removeTrait':
      if (!state.partner) return state;
      return {
        ...state,
        partner: {
          ...state.partner,
          traits: state.partner.traits.map((t) =>
            t.id === action.id ? { ...t, deletedAt: now, updatedAt: now } : t,
          ),
          updatedAt: now,
        },
      };
    case 'recordTurn':
      return {
        ...state,
        practice: {
          turns: state.practice.turns + 1,
          scoreSum: state.practice.scoreSum + action.score,
          affinity: action.affinity,
        },
      };
    case 'wipePartner':
      return {
        ...state,
        partner: null,
        lastAnalysis: null,
        analysisContext: null,
        character: null,
        practice: initialState.practice,
      };
    case 'resetAll':
      return initialState;
  }
}

const Ctx = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const dbState = useDb();
  const db = dbState.status === 'ready' ? dbState.db : null;
  const [state, dispatch] = useReducer(reducer, initialState);
  // DB에서 읽어 오기 전에는 화면을 그리지 않는다 (온보딩이 잠깐 보이는 것 방지)
  const [restored, setRestored] = useState(db === null);
  /** 마지막으로 DB에 쓴 상대. 바뀐 상대(정리하기 · 처음부터 다시)를 지우는 데 쓴다 */
  const savedPartner = useRef<Partner | null>(null);
  /** DB 쓰기를 순서대로 줄 세운다 (앞 저장이 끝나기 전에 다음 저장이 끼어들지 않게) */
  const writes = useRef(Promise.resolve());
  /** 아직 DB에서 지우지 못한 상대. 지우기가 실패하면 여기 남아 다음 저장 때 다시 지운다 */
  const pendingErase = useRef<Partner[]>([]);

  useEffect(() => {
    if (!db) return;
    (async () => {
      // 저장된 값이 깨졌으면 무시하고 기본값(온보딩부터 · 말투 없음)으로 시작한다
      const onboarding = await getJsonSetting(db, ONBOARDING_KEY, OnboardingSchema);
      const partner = await loadPartner(db).catch(() => null);
      savedPartner.current = partner;
      const myStyle = (await getJsonSetting(db, MY_STYLE_KEY, MyStyle)) ?? [];
      const character = await getJsonSetting(db, CHARACTER_KEY, CharacterSchema);
      dispatch({ type: 'restore', onboarding, partner, myStyle, character });
    })().finally(() => setRestored(true));
  }, [db]);

  useEffect(() => {
    if (db && restored) void setSetting(db, ONBOARDING_KEY, JSON.stringify(state.onboarding));
  }, [db, restored, state.onboarding]);

  useEffect(() => {
    if (db && restored) void setSetting(db, MY_STYLE_KEY, JSON.stringify(state.myStyle));
  }, [db, restored, state.myStyle]);

  useEffect(() => {
    if (db && restored) void setSetting(db, CHARACTER_KEY, JSON.stringify(state.character));
  }, [db, restored, state.character]);

  useEffect(() => {
    if (!db || !restored) return;
    const prev = savedPartner.current;
    const next = state.partner;
    if (prev === next) return;
    savedPartner.current = next;
    if (prev && prev.id !== next?.id) pendingErase.current.push(prev);
    writes.current = writes.current
      .then(async () => {
        // 지우기가 먼저다. 실패하면 목록에 남아 다음 변경 때 다시 시도한다
        while (pendingErase.current.length > 0) {
          await erasePartner(db, pendingErase.current[0]!);
          pendingErase.current.shift();
        }
        if (next) await savePartner(db, next);
      })
      .catch(() => {
        // 저장 실패: 현재 상대는 다음 변경 때 통째로 다시 쓰고, 지우지 못한 상대는 위 목록에서 다시 지운다
      });
  }, [db, restored, state.partner]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  if (!restored) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AppStateProvider 밖에서 useAppState를 썼어요');
  return ctx;
}

/** 살아 있는 성향 중 한 종류만 (소통 성향 / 말투) */
export const traitsOf = (p: Partner, kind: TraitKind) =>
  p.traits.filter((t) => t.deletedAt === null && t.kind === kind);

/** soft delete된 레코드를 뺀 목록 */
export const alive = <T extends BaseRecord>(items: T[]) =>
  items.filter((i) => i.deletedAt === null);

export const MEMO_LABELS: Record<MemoKind, string> = {
  anniversary: '기념일 · 처음 만난 날',
  likes: '좋아하는 것',
  dislikes: '싫어하는 것',
  free: '자유 메모',
};

/** 스토리 모드 캐릭터: 사용자가 고른 것, 없으면 승인된 성향으로 추천 */
export const characterFor = (state: State): CharacterId =>
  state.character ??
  recommendCharacter(state.partner ? traitsOf(state.partner, 'trait').map((t) => t.text) : []);

/** LLM에 넘길 내 말투. 없으면 보내지 않는다 (대화 속 "나"의 말투를 따른다) */
export const myStyleFor = (state: State): string[] | undefined =>
  state.myStyle.length > 0 ? state.myStyle : undefined;

/** 서버 요청 스키마(PartnerContext) 한도. 넘으면 요청 전체가 400으로 거절되므로 최근 것부터 잘라 보낸다 */
const CTX_LIMIT = { traits: 20, speech: 8, memos: 20, text: 100, memo: 200 } as const;
const recent = <T,>(xs: T[], n: number) => xs.slice(-n);

/** LLM에 넘길 상대 정보 (승인된 성향 + 메모만). 닉네임이 없으면 "상대" */
export function partnerContext(state: State): PartnerContext {
  const p = state.partner;
  const texts = (kind: TraitKind, n: number) =>
    p ? recent(traitsOf(p, kind), n).map((t) => t.text.slice(0, CTX_LIMIT.text)) : [];
  return {
    label: p?.nickname ?? '상대',
    stage: p?.stage ?? state.onboarding.stage ?? 'some',
    traits: texts('trait', CTX_LIMIT.traits),
    speech: texts('speech', CTX_LIMIT.speech),
    // "기념일 · 처음 만난 날: " 같은 앞말까지 합쳐 200자 안으로
    memos: p
      ? recent(alive(p.memos), CTX_LIMIT.memos).map((m) =>
          `${MEMO_LABELS[m.kind]}: ${m.text}`.slice(0, CTX_LIMIT.memo),
        )
      : [],
  };
}
