// Drizzle 마이그레이션(.sql)을 불러올 수 있게 확장자만 추가. 모노레포 설정은 Expo가 자동으로 한다.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
