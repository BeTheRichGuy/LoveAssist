import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';

import migrations from '../../drizzle/migrations';

import { getOrCreateDbKey } from './key';
import * as schema from './schema';

// 암호화 DB 열기: 키 가져오기 → SQLCipher로 열기 → 암호화 확인 → 마이그레이션.
// 웹 미리보기는 client.web.ts (DB 없이 메모리로만 동작).

const DB_NAME = 'loveassist.db';

export type Db = ReturnType<typeof drizzle<typeof schema>>;
export type DbInfo = {
  /** SQLCipher 버전. 비어 있으면 암호화가 꺼진 빌드 */
  cipherVersion: string;
  /** 키와 DB가 맞지 않아 새로 만들었는지 (백업 · 기기 이전으로 DB 파일만 넘어온 경우) */
  recreated: boolean;
  path: string;
};

async function deleteDb() {
  try {
    await SQLite.deleteDatabaseAsync(DB_NAME);
  } catch {
    // 파일이 없으면 지울 것도 없다
  }
}

async function openWithKey(key: string) {
  const sqlite = await SQLite.openDatabaseAsync(DB_NAME);
  // 키는 DB를 연 직후 첫 명령이어야 한다. 원시 키(x'..') 형식이라 비밀번호 유도 과정을 거치지 않는다
  await sqlite.execAsync(`PRAGMA key = "x'${key}'";`);
  try {
    // 키가 틀리면 여기서 "file is not a database" 오류가 난다
    await sqlite.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
    return sqlite;
  } catch (e) {
    await sqlite.closeAsync();
    throw e;
  }
}

export async function openDb(): Promise<{ db: Db; info: DbInfo } | null> {
  const { key, created } = await getOrCreateDbKey();
  let recreated = false;
  // 키를 새로 만들었는데 DB 파일이 남아 있다면 예전 키로 잠긴 파일이라 읽을 수 없다
  if (created) await deleteDb();
  let sqlite: SQLite.SQLiteDatabase;
  try {
    sqlite = await openWithKey(key);
  } catch {
    await deleteDb();
    sqlite = await openWithKey(key);
    recreated = true;
  }

  const row = await sqlite.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (!row?.cipher_version) {
    await sqlite.closeAsync();
    throw new Error(
      'SQLCipher가 꺼진 빌드예요. app.json의 expo-sqlite useSQLCipher 설정을 확인해 주세요.',
    );
  }
  await sqlite.execAsync('PRAGMA foreign_keys = ON;');
  // 지우거나 덮어쓴 내용을 파일에서 0으로 채운다 (지운 상대 정보가 빈 페이지에 남지 않게)
  await sqlite.execAsync('PRAGMA secure_delete = ON;');

  const db = drizzle(sqlite, { schema });
  await migrate(db, migrations);
  return { db, info: { cipherVersion: row.cipher_version, recreated, path: sqlite.databasePath } };
}
