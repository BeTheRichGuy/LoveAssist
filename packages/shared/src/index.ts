// 앱(apps/mobile)과 중계 서버(apps/relay)가 함께 쓰는 도메인 타입과 API 스키마.
// 요청·응답 형태를 바꿀 때는 여기만 고치면 양쪽 타입이 같이 맞춰진다.
export * from './domain';
export * from './sensitive';
export * from './api/health';
export * from './api/install';
export * from './api/analyze';
export * from './api/score';
export * from './api/simulate';
export * from './api/style';
