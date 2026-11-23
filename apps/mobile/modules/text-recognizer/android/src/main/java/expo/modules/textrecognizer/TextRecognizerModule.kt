package expo.modules.textrecognizer

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 기기 안 OCR (Google ML Kit 한국어 인식기, 모델은 앱에 들어 있어 네트워크를 쓰지 않는다).
// 이미지는 기기 밖으로 나가지 않는다. 결과로 줄마다 글자와 위치(픽셀)를 돌려준다:
// 말풍선이 왼쪽(상대)인지 오른쪽(나)인지는 JS 쪽(src/lib/capture-ocr.ts)에서 위치로 가른다.
class TextRecognizerModule : Module() {
  private val recognizer by lazy {
    TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
  }

  override fun definition() = ModuleDefinition {
    Name("TextRecognizer")

    AsyncFunction("recognizeAsync") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_NO_CONTEXT", "앱 상태를 확인할 수 없어요", null)
        return@AsyncFunction
      }
      val image = try {
        // fromFilePath는 사진의 회전 정보(EXIF)를 반영해 바로 선 이미지 기준으로 좌표를 준다
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject("ERR_IMAGE", "이미지를 읽지 못했어요", e)
        return@AsyncFunction
      }
      recognizer.process(image)
        .addOnSuccessListener { text ->
          val lines = mutableListOf<Map<String, Any>>()
          for (block in text.textBlocks) {
            for (line in block.lines) {
              val box = line.boundingBox ?: continue
              lines.add(
                mapOf(
                  "text" to line.text,
                  "left" to box.left,
                  "top" to box.top,
                  "width" to box.width(),
                  "height" to box.height(),
                )
              )
            }
          }
          promise.resolve(mapOf("width" to image.width, "height" to image.height, "lines" to lines))
        }
        .addOnFailureListener { e -> promise.reject("ERR_OCR", e.message ?: "글자를 읽지 못했어요", e) }
    }
  }
}
