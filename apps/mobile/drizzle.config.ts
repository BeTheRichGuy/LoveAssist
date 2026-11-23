import { defineConfig } from 'drizzle-kit';

// 스키마를 바꾸면 apps/mobile에서 `npm run db:generate` → drizzle/ 폴더에 마이그레이션이 생긴다
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
