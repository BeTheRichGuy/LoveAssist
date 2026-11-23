// 안드로이드 최근 앱 목록에서 앱 화면 미리보기를 숨긴다 (Android 13 / API 33 이상).
// 스크린샷은 막지 않는다 (2026-10-13 결정: 스크린샷 허용, 미리보기만 가림).
// FLAG_SECURE와 달리 setRecentsScreenshotEnabled(false)는 미리보기만 끈다.
const { withMainActivity, WarningAggregator } = require('expo/config-plugins');

const MARKER = 'setRecentsScreenshotEnabled(false)';
const SNIPPET = `
    // 최근 앱 미리보기 숨김 (plugins/with-hide-recents-preview.js)
    if (android.os.Build.VERSION.SDK_INT >= 33) { ${MARKER} }`;

module.exports = function withHideRecentsPreview(config) {
  return withMainActivity(config, (cfg) => {
    const { contents, language } = cfg.modResults;
    if (contents.includes(MARKER)) return cfg;
    if (language !== 'kt') {
      WarningAggregator.addWarningAndroid(
        'with-hide-recents-preview',
        'MainActivity가 Kotlin이 아니라서 건너뜀',
      );
      return cfg;
    }
    const call = /super\.onCreate\([^)]*\)/;
    if (!call.test(contents)) {
      WarningAggregator.addWarningAndroid(
        'with-hide-recents-preview',
        'super.onCreate 호출을 못 찾아 건너뜀',
      );
      return cfg;
    }
    cfg.modResults.contents = contents.replace(call, (m) => m + SNIPPET);
    return cfg;
  });
};
