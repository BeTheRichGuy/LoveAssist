/** OCR로 읽은 한 줄. 좌표는 이미지 픽셀 기준 */
export interface OcrLine {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface OcrResult {
  width: number;
  height: number;
  lines: OcrLine[];
}
