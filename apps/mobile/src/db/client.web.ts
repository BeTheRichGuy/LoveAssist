// 웹 미리보기에는 암호화 DB가 없다 (SQLCipher · 보안 저장소 미지원). 앱은 메모리로만 동작한다.
export type Db = never;
export type DbInfo = { cipherVersion: string; recreated: boolean; path: string };

export async function openDb(): Promise<{ db: Db; info: DbInfo } | null> {
  return null;
}
