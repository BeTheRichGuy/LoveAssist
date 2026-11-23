// 캐릭터 일러스트마다 얼굴 위치 · 크기가 달라서, 고르기 화면에서 얼굴이 같은 자리 · 같은 크기로 보이게 자르는 계산.
// 순수 함수라 vitest로 테스트한다.

/** 그림 안 얼굴: 중심(x, y)과 얼굴 너비(w), 모두 그림 크기에 대한 비율 (0~1) */
export type Face = { x: number; y: number; w: number };

/**
 * 상자(boxW × boxH)를 빈틈없이 덮으면서 얼굴이 상자 너비의 fill만큼, 가로 가운데 · 세로 faceY 높이에 오도록
 * 그림의 크기와 위치(상자 기준 left · top)를 정한다. aspect = 그림 너비 / 높이
 */
export function faceCrop(
  boxW: number,
  boxH: number,
  face: Face,
  aspect: number,
  fill: number,
  faceY = 0.45,
): { width: number; height: number; left: number; top: number } {
  let width = (boxW * fill) / face.w;
  // 상자를 다 덮지 못하면 키운다 (빈 곳이 보이지 않게)
  width = Math.max(width, boxW, boxH * aspect);
  const height = width / aspect;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return {
    width,
    height,
    left: clamp(boxW / 2 - face.x * width, boxW - width),
    top: clamp(boxH * faceY - face.y * height, boxH - height),
  };
}
