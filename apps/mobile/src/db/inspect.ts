import { File, FileMode } from 'expo-file-system';

// 디스크에 있는 DB 파일이 정말 암호화돼 있는지 확인한다.
// 평범한 SQLite 파일은 "SQLite format 3\0"으로 시작하고, SQLCipher 파일은 처음부터 무작위 바이트다.
const PLAIN_HEADER = 'SQLite format 3\u0000';

export type FileCheck = 'encrypted' | 'plain' | 'missing';

export function checkDbFile(path: string): FileCheck {
  const file = new File(path.startsWith('file://') ? path : `file://${path}`);
  if (!file.exists || file.size < 16) return 'missing';
  const handle = file.open(FileMode.ReadOnly);
  try {
    const head = String.fromCharCode(...handle.readBytes(16));
    return head === PLAIN_HEADER ? 'plain' : 'encrypted';
  } finally {
    handle.close();
  }
}
