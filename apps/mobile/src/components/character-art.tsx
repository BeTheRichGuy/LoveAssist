import type { PartnerMood } from '@loveassist/shared';
import { useId, type ReactNode } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { Image } from 'expo-image';
import { View } from 'react-native';

import { CHARACTERS, type CharacterDef, type CharacterId, type HairStyle } from '@/lib/characters';
import { faceCrop } from '@/lib/face-crop';

import { CHARACTER_FRAMES, CHARACTER_IMAGES } from './character-images';

// 스토리 모드 캐릭터 그림: 일본 애니메이션풍 상반신, 표정 6종. 이미지 파일 없이 SVG로 그린다.
// 그림체 요소: 큰 눈(홍채 그라데이션 · 하이라이트 · 굵은 속눈썹), 가닥진 앞머리 + 엔젤링 광택, 빗금 홍조, 앞머리 그림자.
// 성인 외형(목 · 어깨 비율, 20대 사복)으로 고정하고 노출 없는 상반신만 그린다 (결정 10 가드레일).
// 좌표계 200 × 240. 왼쪽만 정의한 옆머리는 mirror()로 오른쪽을 만든다.
// 이미지 생성 도구로 만든 일러스트는 character-images.ts에 등록하면 SVG 대신 보인다 (id + mood → 그림).

const LINE = '#3E2730';
const LASH = '#22161C';
const SKIN = '#FFEDE3';
const SKIN_SHADE = '#F6CDBE';
const BLUSH = '#FF8E9E';
const MOUTH = '#B23A50';

/** "x,y" 좌표 쌍만 쓰는 절대 경로를 좌우로 뒤집는다 */
const mirror = (d: string) =>
  d.replace(
    /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
    (_, x: string, y: string) => `${200 - +x},${y}`,
  );

/**
 * 가닥진 앞머리. 머리 윗부분(캡)에서 시작해 오른쪽 → 왼쪽으로 끝(tip)과 골(valley)을 번갈아 잇는다.
 * 각 가닥은 살짝 휘어진 뾰족한 모양. lines는 가닥 사이의 결 선
 */
function bangs(tips: [number, number][], valley: number, edge = 108) {
  let d = `M50,${edge} C44,60 70,28 100,28 C130,28 156,60 150,${edge}`;
  let lines = '';
  let prev: [number, number] = [150, edge];
  for (const [i, [x, y]] of [...tips].reverse().entries()) {
    const vx = (prev[0] + x) / 2 + 2;
    const v = valley + (i % 2) * 6;
    d += ` C${prev[0] - 1},${prev[1] - 10} ${vx + 3},${v + 8} ${vx},${v}`;
    d += ` C${vx - 1},${v + 10} ${x + 4},${y - 12} ${x},${y}`;
    lines += ` M${vx - 1},${v + 4} C${vx - 2},${v + 12} ${x + 4},${y - 14} ${x + 2},${y - 6}`;
    prev = [x, y];
  }
  d += ` C${prev[0] - 1},${prev[1] - 10} 54,${valley + 6} 50,${edge} Z`;
  return { d, lines };
}

type HairPaths = { back: string; front: { d: string; lines: string }; side?: string };

const LONG_BACK =
  'M44,100 C36,60 66,28 100,28 C134,28 164,60 156,100 C162,140 160,180 168,214 L160,206 L156,220 L148,208 L142,222 L136,200 L132,160 L68,160 L64,200 L58,222 L52,208 L44,220 L40,206 L32,214 C40,180 38,140 44,100 Z';
const SHORT_BACK =
  'M44,104 C38,56 68,26 100,26 C132,26 162,56 156,104 C158,118 156,128 150,134 L144,126 L140,136 L60,136 L56,126 L50,134 C44,128 42,118 44,104 Z';
const LONG_SIDE = 'M52,98 C44,130 52,160 42,198 L48,192 L50,206 C60,180 62,150 60,104 Z';
const SIDEBURN = 'M50,100 C48,112 50,122 55,130 L58,106 Z';

const HAIR: Record<HairStyle, HairPaths> = {
  bob: {
    back: 'M42,100 C36,56 66,28 100,28 C134,28 164,56 158,100 C160,128 160,146 166,160 L158,158 L156,166 L146,160 L136,164 L132,156 L68,156 L64,164 L54,160 L44,166 L42,158 L34,160 C40,146 40,128 42,100 Z',
    front: bangs(
      [
        [56, 104],
        [65, 96],
        [75, 91],
        [86, 96],
        [96, 89],
        [104, 100],
        [113, 90],
        [124, 96],
        [134, 91],
        [144, 104],
      ],
      70,
    ),
    side: 'M50,96 C44,120 48,142 42,160 L50,156 L52,164 C60,150 62,126 58,100 Z',
  },
  wavy: {
    back: LONG_BACK,
    front: bangs(
      [
        [54, 112],
        [63, 98],
        [72, 92],
        [82, 97],
        [92, 90],
        [100, 106],
        [108, 90],
        [118, 97],
        [128, 92],
        [137, 98],
        [146, 112],
      ],
      68,
    ),
    side: 'M52,98 C40,126 54,146 44,172 C38,188 48,200 56,206 C54,190 64,176 60,158 C56,140 62,120 60,104 Z',
  },
  hime: {
    back: LONG_BACK,
    front: bangs(
      [
        [54, 116],
        [63, 98],
        [72, 92],
        [82, 97],
        [92, 90],
        [100, 108],
        [108, 90],
        [118, 97],
        [128, 92],
        [137, 98],
        [146, 116],
      ],
      72,
    ),
    side: LONG_SIDE,
  },
  ponytail: {
    back: 'M44,100 C38,58 66,28 100,28 C134,28 162,58 156,100 L152,142 L48,142 Z M128,40 C156,18 186,40 180,92 C176,128 186,150 176,182 L170,172 L166,184 C158,156 152,132 152,100 C152,74 144,56 128,48 Z',
    front: bangs(
      [
        [56, 108],
        [64, 96],
        [74, 90],
        [86, 96],
        [98, 88],
        [106, 102],
        [116, 90],
        [128, 95],
        [138, 90],
        [146, 106],
      ],
      68,
    ),
    side: 'M51,98 C45,124 49,144 56,160 L58,148 L62,154 C62,134 62,116 60,102 Z',
  },
  fluffy: {
    back: SHORT_BACK,
    front: bangs(
      [
        [60, 96],
        [74, 92],
        [88, 97],
        [102, 91],
        [116, 96],
        [130, 91],
        [142, 95],
      ],
      74,
      102,
    ),
    side: SIDEBURN,
  },
  sidePart: {
    back: SHORT_BACK,
    front: bangs(
      [
        [58, 98],
        [70, 96],
        [84, 92],
        [100, 88],
        [118, 84],
        [138, 86],
      ],
      70,
      102,
    ),
    side: SIDEBURN,
  },
  spiky: {
    back: 'M42,104 C34,60 62,24 100,24 C138,24 166,60 158,104 L166,118 L152,122 L158,136 L42,136 L48,122 L34,118 Z',
    front: bangs(
      [
        [58, 100],
        [70, 92],
        [83, 99],
        [96, 90],
        [109, 98],
        [122, 89],
        [135, 97],
        [146, 92],
      ],
      70,
      104,
    ),
    side: SIDEBURN,
  },
  wolf: {
    back: 'M44,104 C38,56 68,26 100,26 C132,26 162,56 156,104 C160,130 164,150 160,172 L152,164 L146,172 L142,140 L58,140 L54,172 L48,164 L40,172 C36,150 40,130 44,104 Z',
    front: bangs(
      [
        [58, 102],
        [70, 106],
        [84, 99],
        [96, 92],
        [105, 92],
        [117, 99],
        [131, 106],
        [143, 102],
      ],
      76,
    ),
    side: 'M50,98 C46,118 48,136 52,150 L56,140 L60,146 L58,104 Z',
  },
};

const FACE = {
  f: 'M56,92 C56,66 76,50 100,50 C124,50 144,66 144,92 C144,112 141,128 132,142 C124,154 110,166 100,170 C90,166 76,154 68,142 C59,128 56,112 56,92 Z',
  m: 'M56,92 C56,66 76,50 100,50 C124,50 144,66 144,92 C144,114 142,130 134,146 C126,158 110,169 100,172 C90,169 74,158 66,146 C58,130 56,114 56,92 Z',
};

/** 왼쪽 눈썹 (바깥 → 안쪽), 눈 중심 기준 */
const BROW: Record<PartnerMood, string> = {
  neutral: 'M-13,-25 Q-2,-30 10,-26',
  happy: 'M-13,-26 Q-2,-32 10,-28',
  shy: 'M-13,-25 Q-2,-28 10,-29',
  sad: 'M-13,-23 Q0,-26 10,-31',
  annoyed: 'M-13,-29 Q0,-27 10,-21',
  surprised: 'M-13,-30 Q-2,-36 10,-32',
};

const MOUTH_PATH: Partial<Record<PartnerMood, string>> = {
  neutral: 'M95,151 Q100,154 105,151',
  // 참고: 수줍을 때 입은 물결
  shy: 'M93,151 Q96.5,148 100,151 Q103.5,154 107,151',
  sad: 'M95,153 Q100,149 105,153',
  annoyed: 'M94,152 Q97,150 100,151.5 Q103,153 106,150.5',
};

const BLUSH_OPACITY: Record<PartnerMood, number> = {
  neutral: 0.35,
  happy: 0.6,
  shy: 1,
  sad: 0.3,
  annoyed: 0.55,
  surprised: 0.4,
};

// 눈 모양 (왼쪽 눈, 바깥쪽이 -x)
const EYE_WHITE =
  'M-14,-3 C-12,-12 0,-16 11,-11 C14,-6 14,4 10,10 C5,14 -5,14 -10,10 C-13,6 -15,1 -14,-3 Z';
const LASH_LINE =
  'M-17,-1 C-15,-12 -1,-19 11,-13 C14,-11.5 16,-8 16.5,-5 L14,-6 C11,-11 1,-14 -7,-12 C-12,-10 -14,-6 -15,1 Z';
const LASH_FLICKS = 'M-15.5,-3 L-21,-5.5 L-16,-6.8 Z M-13.5,-8.5 L-18.5,-13 L-12.2,-11 Z';
const CREASE = 'M-11,-17 C-4,-21 5,-20 11,-17';
/** 눈 중심 높이. 입 · 코 · 볼은 여기에 맞춰 LOWER만큼 내린다 */
const EYE_Y = 119;
const LOWER = 'translate(0,5)';

function Eye({ c, mood, uid }: { c: CharacterDef; mood: PartnerMood; uid: string }) {
  const f = c.look === 'f';
  if (mood === 'happy') {
    return (
      <G>
        <Path d="M-14,3 C-9,-8 6,-9 13,1 C7,-4 -8,-3.5 -14,3 Z" fill={LASH} />
        {f ? <Path d="M-14,3 L-19.5,1.5 L-14.5,0 Z" fill={LASH} /> : null}
      </G>
    );
  }
  const surprised = mood === 'surprised';
  const lookX = mood === 'shy' ? 3 : 0;
  const lookY = mood === 'shy' ? 2 : 0;
  const irisRx = surprised ? 6.5 : 9.5;
  const irisRy = surprised ? 8 : 11.5;
  const ix = 1 + lookX;
  const iy = 2 + lookY;
  const lid = mood === 'shy' ? 4 : surprised ? -1.5 : 0;

  return (
    <G transform={f ? undefined : 'scale(1,0.84)'}>
      <Path d={EYE_WHITE} fill="#FFFFFF" />
      <G clipPath={`url(#eye${uid})`}>
        <Ellipse cx={ix} cy={iy} rx={irisRx} ry={irisRy} fill={`url(#iris${uid})`} />
        <Ellipse
          cx={ix}
          cy={iy}
          rx={irisRx}
          ry={irisRy}
          fill="none"
          stroke={LASH}
          strokeWidth={1}
          opacity={0.5}
        />
        <Ellipse
          cx={ix}
          cy={iy + 1}
          rx={irisRx * 0.42}
          ry={irisRy * 0.5}
          fill={LASH}
          opacity={0.85}
        />
        <Ellipse
          cx={ix}
          cy={iy + irisRy * 0.55}
          rx={irisRx * 0.62}
          ry={irisRy * 0.28}
          fill="#FFFFFF"
          opacity={0.35}
        />
        {/* 윗눈꺼풀 그림자 */}
        <Path d="M-16,-16 L16,-16 L16,-7 C8,-12 -6,-11 -16,-1 Z" fill="#9C93C4" opacity={0.45} />
        {mood === 'shy' ? (
          <Path d="M-16,-17 L16,-17 L16,-3 C6,-8 -6,-8 -16,1 Z" fill={SKIN} />
        ) : null}
        {mood === 'annoyed' ? (
          <Path d="M-16,-17 L16,-17 L16,2 C6,-1 -6,-3 -16,-1 Z" fill={SKIN} />
        ) : null}
      </G>
      {/* 하이라이트 */}
      <Ellipse
        cx={ix - irisRx * 0.4}
        cy={iy - irisRy * 0.38}
        rx={surprised ? 2.2 : 3.4}
        ry={surprised ? 2.6 : 4.2}
        fill="#FFFFFF"
      />
      <Circle cx={ix + irisRx * 0.45} cy={iy + irisRy * 0.42} r={1.5} fill="#FFFFFF" />
      <Circle cx={ix + irisRx * 0.5} cy={iy - irisRy * 0.35} r={0.9} fill="#FFFFFF" opacity={0.9} />
      {mood === 'sad' ? (
        <Circle cx={ix - 1} cy={iy + 4} r={1.8} fill="#FFFFFF" opacity={0.85} />
      ) : null}

      {/* 속눈썹 라인 */}
      {mood === 'annoyed' ? (
        <Path d="M-17,-2.5 C-6,-4 6,-1.5 15.5,1.5 L14.5,4 C5,1 -6,-1 -15.5,0.5 Z" fill={LASH} />
      ) : (
        <G transform={lid ? `translate(0,${lid})` : undefined}>
          <Path d={LASH_LINE} fill={LASH} />
          {f ? <Path d={LASH_FLICKS} fill={LASH} /> : null}
        </G>
      )}
      {mood !== 'annoyed' && mood !== 'shy' ? (
        <Path
          d={CREASE}
          stroke={LINE}
          strokeWidth={1}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />
      ) : null}
      <Path
        d="M-10,10.5 C-6,13.2 0,14.2 6,12.8"
        stroke={mood === 'sad' ? '#7FB8E8' : LINE}
        strokeWidth={mood === 'sad' ? 1.6 : 1}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      {f ? (
        <Path
          d="M-8,12.2 L-9,14.4 M-4,13.4 L-4.6,15.6"
          stroke={LINE}
          strokeWidth={0.8}
          opacity={0.6}
        />
      ) : null}
      {mood === 'sad' ? (
        <Path
          d="M-11,13 Q-14.5,19.5 -11,22.5 Q-7.5,19.5 -11,13 Z"
          fill="#CDEBFF"
          stroke="#7FB8E8"
          strokeWidth={0.9}
        />
      ) : null}
    </G>
  );
}

function Accessory({ c }: { c: CharacterDef }) {
  switch (c.accessory) {
    case 'clip':
      return (
        <G transform="translate(132,66)" stroke={LINE} strokeWidth={1}>
          <Path d="M-9,-3 L9,3" stroke="#FFD84D" strokeWidth={4} strokeLinecap="round" />
          <Path d="M-9,3 L9,-3" stroke="#FFC23D" strokeWidth={4} strokeLinecap="round" />
        </G>
      );
    case 'glasses':
      return (
        <G fill="none" stroke="#2A2A34" strokeWidth={1.8} transform="translate(0,4)">
          <Path d="M62,108 Q62,103 67,103 L90,103 Q95,103 95,108 L95,120 Q95,127 88,127 L69,127 Q62,127 62,120 Z" />
          <Path d="M105,108 Q105,103 110,103 L133,103 Q138,103 138,108 L138,120 Q138,127 131,127 L112,127 Q105,127 105,120 Z" />
          <Path d="M95,110 Q100,106 105,110" />
          <Path
            d="M68,122 L76,106 M111,122 L119,106"
            stroke="#FFFFFF"
            strokeWidth={1.2}
            opacity={0.45}
          />
        </G>
      );
    case 'earring':
      return (
        <G>
          <Circle cx={56} cy={124} r={3.2} fill="none" stroke="#DCE0EC" strokeWidth={1.6} />
          <Circle cx={56} cy={128} r={1.6} fill="#DCE0EC" />
        </G>
      );
    case 'scrunchie':
      return (
        <G>
          <Ellipse
            cx={138}
            cy={44}
            rx={10}
            ry={7}
            fill="#FFF4F6"
            stroke={LINE}
            strokeWidth={1.2}
            transform="rotate(-30,138,44)"
          />
          <Path
            d="M133,40 Q138,44 136,50 M141,38 Q144,44 142,49"
            stroke="#E2C2CA"
            strokeWidth={1.1}
            fill="none"
          />
        </G>
      );
    default:
      return null;
  }
}

/** 옷: 어깨 + 목선 (20대 사복) */
function Outfit({ c }: { c: CharacterDef }) {
  const body = 'M22,240 C24,208 56,192 86,188 L114,188 C144,192 176,208 178,240 Z';
  return (
    <G>
      <Path d={body} fill={c.outfit} stroke={LINE} strokeWidth={1.4} />
      <Path
        d="M40,214 C46,206 56,200 66,198 M160,214 C154,206 144,200 134,198"
        stroke={c.outfitShade}
        strokeWidth={3}
        fill="none"
        opacity={0.7}
      />
      {c.id === 'cool' ? (
        <Path
          d="M84,180 Q100,192 116,180 L118,198 Q100,208 82,198 Z"
          fill={c.outfitShade}
          stroke={LINE}
          strokeWidth={1.2}
        />
      ) : (
        <Path d="M86,188 L100,216 L114,188 Z" fill={c.inner} stroke={LINE} strokeWidth={1.2} />
      )}
      {c.id === 'sunny' || c.id === 'puppy' ? (
        <G stroke={LINE} strokeWidth={1.2}>
          <Path d="M74,192 Q100,208 126,192" fill="none" stroke={c.outfitShade} strokeWidth={6} />
          <Path d="M92,206 L90,228 M108,206 L110,228" />
          <Circle cx={90} cy={230} r={2.2} fill={c.inner} />
          <Circle cx={110} cy={230} r={2.2} fill={c.inner} />
        </G>
      ) : null}
      {c.id === 'chic' || c.id === 'calm' || c.id === 'playful' ? (
        <Path
          d="M86,188 L98,240 M114,188 L102,240"
          stroke={c.outfitShade}
          strokeWidth={4}
          fill="none"
        />
      ) : null}
      {c.id === 'gentle' || c.id === 'tsun' ? (
        <Path
          d="M86,188 L95,203 L80,207 Z M114,188 L105,203 L120,207 Z"
          fill={c.inner}
          stroke={LINE}
          strokeWidth={1.1}
        />
      ) : null}
    </G>
  );
}

type ArtProps = { id: CharacterId; mood?: PartnerMood; width?: number };

/**
 * 얼굴이 상자 너비에서 차지하는 비율. face = 고르기 화면 작은 칸(얼굴 위주) · portrait = 큰 미리보기(상반신)
 * 그림마다 얼굴 위치 · 크기가 달라 CHARACTER_FRAMES로 맞춘다
 */
const FILL = { face: 0.62, portrait: 0.4 } as const;

/** 캐릭터 그림 (상자 비율 5:6). 생성한 일러스트가 등록돼 있으면 얼굴을 맞춰 자르고, 없으면 SVG 시안 */
export function CharacterArt({
  id,
  mood = 'neutral',
  width = 200,
  framing = 'portrait',
}: ArtProps & { framing?: keyof typeof FILL }) {
  const src = CHARACTER_IMAGES[id]?.[mood];
  if (src === undefined) return <CharacterSketch id={id} mood={mood} width={width} />;
  const height = (width * 240) / 200;
  const { face, aspect } = CHARACTER_FRAMES[id];
  const crop = faceCrop(width, height, face, aspect, FILL[framing]);
  return (
    <View style={{ width, height, borderRadius: width / 12, overflow: 'hidden' }}>
      <Image
        source={src}
        style={{ position: 'absolute', ...crop }}
        contentFit="fill"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

/** SVG 시안 (일러스트가 아직 없는 캐릭터 · 표정용) */
function CharacterSketch({ id, mood = 'neutral', width = 200 }: ArtProps) {
  const c = CHARACTERS[id];
  const hair = HAIR[c.hairStyle];
  // 한 화면에 여러 캐릭터가 있으면 웹에서 그라데이션 · 클립 id가 겹친다
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const browW = c.look === 'f' ? 2.2 : 3.4;
  const hairLine = { stroke: c.hairShade, strokeWidth: 1.3, strokeLinejoin: 'round' as const };
  // 애니풍: 눈을 크게, 얼굴 아래쪽에. 눈썹은 크기를 키우지 않고 위로만 올린다
  const eyeScale = c.look === 'f' ? 1.22 : 1.08;
  const eyes = (node: (side: 'l' | 'r') => ReactNode, brow = false) => {
    const k = brow ? 1 : eyeScale;
    const y = brow ? EYE_Y - 7 : EYE_Y;
    return (
      <>
        <G transform={`translate(78,${y}) scale(${k},${k})`}>{node('l')}</G>
        <G transform={`translate(122,${y}) scale(${-k},${k})`}>{node('r')}</G>
      </>
    );
  };

  return (
    <Svg width={width} height={(width * 240) / 200} viewBox="0 0 200 240">
      <Defs>
        <LinearGradient id={`iris${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={LASH} />
          <Stop offset="0.3" stopColor={c.eye} />
          <Stop offset="0.75" stopColor={c.eye} stopOpacity={0.75} />
          <Stop offset="1" stopColor="#FFFFFF" />
        </LinearGradient>
        <LinearGradient id={`hair${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.hair} />
          <Stop offset="1" stopColor={c.hairShade} />
        </LinearGradient>
        <RadialGradient id={`blush${uid}`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={BLUSH} stopOpacity={0.75} />
          <Stop offset="1" stopColor={BLUSH} stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={`eye${uid}`}>
          <Path d={EYE_WHITE} />
        </ClipPath>
        <ClipPath id={`face${uid}`}>
          <Path d={FACE[c.look]} />
        </ClipPath>
      </Defs>

      <Path d={hair.back} fill={c.hairShade} {...hairLine} />
      <Path
        d="M88,150 L88,192 Q100,200 112,192 L112,150 Z"
        fill={SKIN}
        stroke={LINE}
        strokeWidth={1.2}
      />
      <Path d="M88,164 Q100,182 112,164 L112,178 Q100,190 88,178 Z" fill={SKIN_SHADE} />
      <Outfit c={c} />

      <Ellipse cx={56} cy={112} rx={5.5} ry={9.5} fill={SKIN} stroke={LINE} strokeWidth={1.2} />
      <Ellipse cx={144} cy={112} rx={5.5} ry={9.5} fill={SKIN} stroke={LINE} strokeWidth={1.2} />
      <Path d={FACE[c.look]} fill={SKIN} stroke={LINE} strokeWidth={1.4} />
      {/* 앞머리 그림자 (셀 음영) */}
      <G clipPath={`url(#face${uid})`}>
        <Path d={hair.front.d} fill="#E9AE9E" transform="translate(0.5,3.5)" opacity={0.5} />
      </G>

      <G opacity={BLUSH_OPACITY[mood]} transform={LOWER}>
        <Ellipse cx={70} cy={136} rx={14} ry={7.5} fill={`url(#blush${uid})`} />
        <Ellipse cx={130} cy={136} rx={14} ry={7.5} fill={`url(#blush${uid})`} />
        <Path
          d="M63,139 L66,133 M67.5,139.5 L70.5,133.5 M72,139.5 L75,133.5 M76.5,139 L79,134 M121,139 L123.5,134 M125,139.5 L128,133.5 M129.5,139.5 L132.5,133.5 M134,139 L137,133"
          stroke="#E2667A"
          strokeWidth={0.9}
          strokeLinecap="round"
        />
      </G>

      {eyes((s) => (
        <Eye key={s} c={c} mood={mood} uid={uid} />
      ))}
      <G transform={LOWER}>
        <Path
          d="M101,133 L99.6,137 L101.6,137.4"
          stroke="#D99484"
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {mood === 'happy' ? (
          <G>
            <Path
              d="M93,148 Q100,150 107,148 Q105.5,157 100,158 Q94.5,157 93,148 Z"
              fill={MOUTH}
              stroke={LINE}
              strokeWidth={1.1}
            />
            <Path d="M96,154.5 Q100,152 104,154.5 Q100,158 96,154.5 Z" fill="#F38A9C" />
          </G>
        ) : mood === 'surprised' ? (
          <Ellipse
            cx={100}
            cy={152}
            rx={3.6}
            ry={4.6}
            fill={MOUTH}
            stroke={LINE}
            strokeWidth={1.1}
          />
        ) : (
          <Path
            d={MOUTH_PATH[mood]!}
            stroke={LINE}
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </G>

      <Path d={hair.front.d} fill={`url(#hair${uid})`} {...hairLine} />
      <Path d={hair.front.lines} stroke={c.hairShade} strokeWidth={0.9} fill="none" opacity={0.7} />
      {hair.side ? (
        <>
          <Path d={hair.side} fill={`url(#hair${uid})`} {...hairLine} />
          <Path d={mirror(hair.side)} fill={`url(#hair${uid})`} {...hairLine} />
        </>
      ) : null}
      {/* 엔젤링 광택 */}
      <Path
        d="M62,58 Q100,38 138,58 L134,61 L130,56 L125,62 L119,55 L113,61 L107,54 L101,61 L95,54 L89,61 L83,55 L77,62 L71,56 L66,61 Z"
        fill={c.hairLight}
        opacity={0.85}
      />

      {eyes(
        (s) => (
          <Path
            key={s}
            d={BROW[mood]}
            stroke={c.hairShade}
            strokeWidth={browW}
            strokeLinecap="round"
            fill="none"
          />
        ),
        true,
      )}

      <Accessory c={c} />

      {mood === 'annoyed' ? (
        <G
          transform="translate(152,62)"
          stroke="#E04050"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        >
          <Path d="M-7,-2 Q-2,-2 -2,-7 M2,-7 Q2,-2 7,-2 M7,2 Q2,2 2,7 M-2,7 Q-2,2 -7,2" />
        </G>
      ) : null}
      {mood === 'surprised' ? (
        <Path
          d="M154,86 Q148,96 154,101 Q160,96 154,86 Z"
          fill="#CDEBFF"
          stroke="#7FB8E8"
          strokeWidth={1.1}
        />
      ) : null}
    </Svg>
  );
}
