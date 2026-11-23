import { defineConfig } from 'vitest/config';

// 화면 없는 순수 로직(src/lib)만 테스트한다. React Native 모듈은 불러오지 않는다.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
