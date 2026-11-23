export type FileCheck = 'encrypted' | 'plain' | 'missing';

export function checkDbFile(_path: string): FileCheck {
  return 'missing';
}
