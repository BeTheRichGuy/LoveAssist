// Drizzle 마이그레이션(.sql)을 문자열로 번들에 넣기 위한 설정. 나머지는 Expo 기본값 그대로.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
