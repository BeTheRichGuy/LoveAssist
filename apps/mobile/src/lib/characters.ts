// 스토리 모드 캐릭터 목록 (설계 결정 10). 상대 성향에 맞춰 고르는 오리지널 성인 캐릭터 8종.
// 상대 사진을 쓰지 않고, 정해 둔 그림(components/character-art.tsx)만 쓴다 (자유 프롬프트 · 이미지 변환 없음).
// 순수 로직이라 vitest로 테스트한다.

export const CHARACTER_IDS = [
  'sunny',
  'gentle',
  'cool',
  'tsun',
  'puppy',
  'calm',
  'chic',
  'playful',
] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export type HairStyle =
  'bob' | 'wavy' | 'hime' | 'ponytail' | 'fluffy' | 'sidePart' | 'spiky' | 'wolf';

export interface CharacterDef {
  id: CharacterId;
  /** 성향 이름 (화면 표시) */
  label: string;
  /** 한 줄 소개 */
  blurb: string;
  look: 'f' | 'm';
  hairStyle: HairStyle;
  hair: string;
  /** 머리 그림자 · 외곽선 */
  hairShade: string;
  /** 머리 광택 (엔젤링) */
  hairLight: string;
  eye: string;
  outfit: string;
  outfitShade: string;
  /** 안쪽 옷 (셔츠 · 티) */
  inner: string;
  accessory?: 'clip' | 'glasses' | 'earring' | 'scrunchie';
  /** 승인된 성향 문장에 이 말이 들어 있으면 이 캐릭터를 추천한다 */
  keywords: string[];
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  sunny: {
    id: 'sunny',
    label: '햇살형',
    blurb: '밝고 리액션이 큰 타입',
    look: 'f',
    hairStyle: 'bob',
    hair: '#E8935A',
    hairShade: '#B8623A',
    hairLight: '#FFC59A',
    eye: '#D98A1E',
    outfit: '#F6C453',
    outfitShade: '#D9A23A',
    inner: '#FFF6E0',
    accessory: 'clip',
    keywords: ['활발', '밝', '에너지', '리액션', '신나', '긍정', '수다'],
  },
  gentle: {
    id: 'gentle',
    label: '다정형',
    blurb: '먼저 챙기고 공감해 주는 타입',
    look: 'f',
    hairStyle: 'wavy',
    hair: '#8A5A44',
    hairShade: '#5E3A2C',
    hairLight: '#C8957A',
    eye: '#9A6A4A',
    outfit: '#F3E6D2',
    outfitShade: '#D8C4A8',
    inner: '#FFFFFF',
    keywords: ['다정', '배려', '따뜻', '공감', '챙기', '걱정', '부드'],
  },
  cool: {
    id: 'cool',
    label: '쿨형',
    blurb: '담백하고 차분한 타입',
    look: 'f',
    hairStyle: 'hime',
    hair: '#2E2A3A',
    hairShade: '#16131E',
    hairLight: '#6E6A8E',
    eye: '#5A7BB0',
    outfit: '#2F3E5C',
    outfitShade: '#1F2A40',
    inner: '#2F3E5C',
    keywords: ['차분', '쿨', '담백', '무심', '조용', '혼자', '독립'],
  },
  tsun: {
    id: 'tsun',
    label: '새침형',
    blurb: '튕기지만 속은 여린 타입',
    look: 'f',
    hairStyle: 'ponytail',
    hair: '#D9607A',
    hairShade: '#A63E58',
    hairLight: '#FFA9BC',
    eye: '#B8325A',
    outfit: '#7A2E45',
    outfitShade: '#5A1F32',
    inner: '#FFFFFF',
    accessory: 'scrunchie',
    keywords: ['새침', '츤', '튕기', '삐지', '서운', '자존심', '확인'],
  },
  puppy: {
    id: 'puppy',
    label: '댕댕형',
    blurb: '표현 많고 애교 있는 타입',
    look: 'm',
    hairStyle: 'fluffy',
    hair: '#B07A4E',
    hairShade: '#7A5030',
    hairLight: '#E0AE80',
    eye: '#7A4A2A',
    outfit: '#8EC5EA',
    outfitShade: '#6AA3CB',
    inner: '#FFFFFF',
    keywords: ['애교', '표현', '귀엽', '칭찬', '이모티콘', '솔직', '자주'],
  },
  calm: {
    id: 'calm',
    label: '어른형',
    blurb: '진지하고 신중한 타입',
    look: 'm',
    hairStyle: 'sidePart',
    hair: '#3A2E2A',
    hairShade: '#1E1614',
    hairLight: '#7A6A62',
    eye: '#4A5A6A',
    outfit: '#4A4F5C',
    outfitShade: '#33373F',
    inner: '#E9DFCF',
    accessory: 'glasses',
    keywords: ['진지', '어른', '신중', '논리', '계획', '현실', '대화로'],
  },
  chic: {
    id: 'chic',
    label: '무뚝뚝형',
    blurb: '말은 짧아도 행동으로 챙기는 타입',
    look: 'm',
    hairStyle: 'spiky',
    hair: '#22222A',
    hairShade: '#0E0E12',
    hairLight: '#5A5A70',
    eye: '#6A4A8A',
    outfit: '#2A2A30',
    outfitShade: '#18181C',
    inner: '#F2F2F2',
    keywords: ['무뚝뚝', '짧게', '단답', '표현이 적', '서툴', '행동'],
  },
  playful: {
    id: 'playful',
    label: '장난형',
    blurb: '농담으로 분위기를 띄우는 타입',
    look: 'm',
    hairStyle: 'wolf',
    hair: '#7A8FB8',
    hairShade: '#4E6290',
    hairLight: '#B8C8EC',
    eye: '#3A8A8A',
    outfit: '#5FB89A',
    outfitShade: '#3F9478',
    inner: '#20302A',
    accessory: 'earring',
    keywords: ['장난', '농담', '유머', 'ㅋㅋ', '놀리', '재밌', '드립'],
  },
};

/** 성향 문장과 겹치는 키워드 수로 점수를 매긴다 */
function matchScore(def: CharacterDef, traits: string[]): number {
  return def.keywords.reduce((n, k) => n + traits.filter((t) => t.includes(k)).length, 0);
}

/**
 * 승인된 성향에 가장 맞는 캐릭터. look을 주면 그 안에서 고른다.
 * 맞는 게 없으면 목록 순서상 첫 캐릭터 (점수가 같으면 앞 순서)
 */
export function recommendCharacter(traits: string[], look?: 'f' | 'm'): CharacterId {
  const pool = CHARACTER_IDS.filter((id) => !look || CHARACTERS[id].look === look);
  let best = pool[0]!;
  let bestScore = 0;
  for (const id of pool) {
    const s = matchScore(CHARACTERS[id], traits);
    if (s > bestScore) [best, bestScore] = [id, s];
  }
  return best;
}
