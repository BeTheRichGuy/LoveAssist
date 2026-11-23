// 다른 앱(카톡 · 라인)에서 "공유 → 이 앱"으로 대화 파일을 보내면 expo-sharing이 loveassist://expo-sharing 으로 연다.
// 그때는 말투 학습 화면으로 보낸다 (받은 파일은 그 화면에서 읽고 바로 지운다).
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (new URL(path).hostname === 'expo-sharing') return `/style-learn?shared=${Date.now()}`;
    return path;
  } catch {
    return path;
  }
}
