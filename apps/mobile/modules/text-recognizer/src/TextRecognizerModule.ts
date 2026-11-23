import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { OcrResult } from './TextRecognizer.types';

declare class TextRecognizerModule extends NativeModule<Record<string, never>> {
  recognizeAsync(uri: string): Promise<OcrResult>;
}

/** 예전에 빌드한 테스트 앱에는 이 모듈이 없다. 그때는 null (화면에서 "앱을 다시 설치해 주세요" 안내) */
export default requireOptionalNativeModule<TextRecognizerModule>('TextRecognizer');
