import type { PartnerMood } from '@loveassist/shared';

import type { CharacterId } from '@/lib/characters';
import type { Face } from '@/lib/face-crop';

// 이미지 생성 도구(ChatGPT)로 만든 캐릭터 일러스트 등록표. 파일은 apps/mobile/assets/characters/<id>/<mood>.jpg
// (원본 묶음 그림은 저장소에 포함하지 않았다).
// 여기 없는 캐릭터 · 표정은 SVG 시안으로 보인다.
// 임시 시안 (2026-10-14). gentle · calm의 옷 노출은 성인 전용 앱의 임시 시안이라 사용자가 허용했다. 정식 그림 때 다시 본다.
export const CHARACTER_IMAGES: Partial<Record<CharacterId, Partial<Record<PartnerMood, number>>>> =
  {
    sunny: {
      neutral: require('../../assets/characters/sunny/neutral.jpg'),
      happy: require('../../assets/characters/sunny/happy.jpg'),
      shy: require('../../assets/characters/sunny/shy.jpg'),
      sad: require('../../assets/characters/sunny/sad.jpg'),
      annoyed: require('../../assets/characters/sunny/annoyed.jpg'),
      surprised: require('../../assets/characters/sunny/surprised.jpg'),
    },
    cool: {
      neutral: require('../../assets/characters/cool/neutral.jpg'),
      happy: require('../../assets/characters/cool/happy.jpg'),
      shy: require('../../assets/characters/cool/shy.jpg'),
      sad: require('../../assets/characters/cool/sad.jpg'),
      annoyed: require('../../assets/characters/cool/annoyed.jpg'),
      surprised: require('../../assets/characters/cool/surprised.jpg'),
    },
    tsun: {
      neutral: require('../../assets/characters/tsun/neutral.jpg'),
      happy: require('../../assets/characters/tsun/happy.jpg'),
      shy: require('../../assets/characters/tsun/shy.jpg'),
      sad: require('../../assets/characters/tsun/sad.jpg'),
      annoyed: require('../../assets/characters/tsun/annoyed.jpg'),
      surprised: require('../../assets/characters/tsun/surprised.jpg'),
    },
    puppy: {
      neutral: require('../../assets/characters/puppy/neutral.jpg'),
      happy: require('../../assets/characters/puppy/happy.jpg'),
      shy: require('../../assets/characters/puppy/shy.jpg'),
      sad: require('../../assets/characters/puppy/sad.jpg'),
      annoyed: require('../../assets/characters/puppy/annoyed.jpg'),
      surprised: require('../../assets/characters/puppy/surprised.jpg'),
    },
    chic: {
      neutral: require('../../assets/characters/chic/neutral.jpg'),
      happy: require('../../assets/characters/chic/happy.jpg'),
      shy: require('../../assets/characters/chic/shy.jpg'),
      sad: require('../../assets/characters/chic/sad.jpg'),
      annoyed: require('../../assets/characters/chic/annoyed.jpg'),
      surprised: require('../../assets/characters/chic/surprised.jpg'),
    },
    playful: {
      neutral: require('../../assets/characters/playful/neutral.jpg'),
      happy: require('../../assets/characters/playful/happy.jpg'),
      shy: require('../../assets/characters/playful/shy.jpg'),
      sad: require('../../assets/characters/playful/sad.jpg'),
      annoyed: require('../../assets/characters/playful/annoyed.jpg'),
      surprised: require('../../assets/characters/playful/surprised.jpg'),
    },
    gentle: {
      neutral: require('../../assets/characters/gentle/neutral.jpg'),
      happy: require('../../assets/characters/gentle/happy.jpg'),
      shy: require('../../assets/characters/gentle/shy.jpg'),
      sad: require('../../assets/characters/gentle/sad.jpg'),
      annoyed: require('../../assets/characters/gentle/annoyed.jpg'),
      surprised: require('../../assets/characters/gentle/surprised.jpg'),
    },
    calm: {
      neutral: require('../../assets/characters/calm/neutral.jpg'),
      happy: require('../../assets/characters/calm/happy.jpg'),
      shy: require('../../assets/characters/calm/shy.jpg'),
      sad: require('../../assets/characters/calm/sad.jpg'),
      annoyed: require('../../assets/characters/calm/annoyed.jpg'),
      surprised: require('../../assets/characters/calm/surprised.jpg'),
    },
  };

/**
 * 그림 속 얼굴 위치(기본 표정 기준, 비율)와 그림 비율(너비/높이). 고르기 화면에서 얼굴을 같은 크기로 맞추는 데 쓴다.
 * 그림을 바꾸면 다시 잰다 (얼굴 중심 = 눈과 턱 사이, w = 볼 너비)
 */
export const CHARACTER_FRAMES: Record<CharacterId, { face: Face; aspect: number }> = {
  sunny: { face: { x: 0.52, y: 0.42, w: 0.45 }, aspect: 0.48 },
  gentle: { face: { x: 0.55, y: 0.38, w: 0.42 }, aspect: 0.48 },
  cool: { face: { x: 0.56, y: 0.35, w: 0.38 }, aspect: 0.5 },
  tsun: { face: { x: 0.56, y: 0.41, w: 0.42 }, aspect: 0.48 },
  puppy: { face: { x: 0.48, y: 0.38, w: 0.5 }, aspect: 0.44 },
  calm: { face: { x: 0.52, y: 0.32, w: 0.36 }, aspect: 0.56 },
  chic: { face: { x: 0.6, y: 0.45, w: 0.55 }, aspect: 0.4 },
  playful: { face: { x: 0.62, y: 0.45, w: 0.5 }, aspect: 0.48 },
};
